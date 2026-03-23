package com.brickers.backend.payment.service;

import com.brickers.backend.billing.service.GooglePlayValidator;
import com.brickers.backend.payment.dto.*;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
import com.brickers.backend.user.service.MembershipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 결제 주문 관리와 외부 결제 연동 흐름을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentPlanRepository planRepository;
    private final PaymentOrderRepository orderRepository;
    private final GooglePlayValidator googlePlayValidator;

    private final MembershipService membershipService;
    private final GooglePayProcessor googlePayProcessor;
    private final PaymentMapper paymentMapper;

    /** 요금제 목록 조회 */
    @Transactional(readOnly = true)
    public List<PaymentPlanResponse> getAvailablePlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(PaymentPlanResponse::from)
                .collect(Collectors.toList());
    }

    /** 결제 요청 생성 (주문 생성) */
    @Transactional
    public PaymentOrderResponse createCheckout(Authentication auth, PaymentCheckoutRequest req) {
        String userId = (String) auth.getPrincipal();
        PaymentPlan plan = planRepository.findById(req.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 플랜입니다."));

        String orderNo = generateOrderNo();
        PaymentOrder order = PaymentOrder.builder()
                .orderNo(orderNo)
                .userId(userId)
                .planId(plan.getId())
                .planCode(plan.getCode())
                .planName(plan.getName())
                .amount(plan.getPrice())
                .status(PaymentStatus.PENDING)
                .checkoutUrl("/api/payments/orders/" + orderNo + "/status")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return paymentMapper.toResponse(orderRepository.save(order));
    }

    /** 결제 상태 조회 */
    @Transactional(readOnly = true)
    public PaymentOrderResponse getOrder(Authentication auth, String orderId) {
        String userId = (String) auth.getPrincipal();
        PaymentOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        validateOwnership(order, userId);
        return paymentMapper.toResponse(order);
    }

    /** 결제 취소 요청 */
    @Transactional
    public void cancelOrder(Authentication auth, String orderId) {
        String userId = (String) auth.getPrincipal();
        log.info("Cancel order requested: orderId={}, userId={}", orderId, userId);

        PaymentOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        validateOwnership(order, userId);

        if (!order.canCancelByUser()) {
            throw new IllegalStateException("취소 가능한 상태가 아닙니다.");
        }

        if (order.getStatus() == PaymentStatus.COMPLETED) {
            order.markRefundRequested("사용자 환불 요청");
        } else {
            order.markCanceled("사용자 취소 요청");
        }
        orderRepository.save(order);
    }

    /** 내 결제 내역 조회 */
    @Transactional(readOnly = true)
    public Page<PaymentOrderResponse> getMyHistory(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return orderRepository.findByUserId(userId, pageable).map(paymentMapper::toResponse);
    }

    /** 결제 웹훅 처리 (PG사 결과 수신) */
    @Transactional
    public void processWebhook(PaymentWebhookRequest req) {
        PaymentOrder order = orderRepository.findByPgOrderId(req.getPgOrderId())
                .orElseThrow(() -> new IllegalArgumentException("해당 주문을 찾을 수 없습니다: " + req.getPgOrderId()));

        if (order.getStatus() != PaymentStatus.PENDING)
            return;

        // 금액 검증
        if (req.getAmount() != null && !req.getAmount().equals(order.getAmount())) {
            log.error("Amount mismatch! orderNo={}", order.getOrderNo());
            order.markFailed();
            orderRepository.save(order);
            throw new IllegalStateException("결제 금액 불일치");
        }

        if (isSuccessStatus(req.getStatus())) {
            order.markCompleted(req.getPaymentKey());
            membershipService.applyMembership(order.getUserId(), order.getPlanCode());
        } else {
            order.markFailed();
        }

        orderRepository.save(order);
    }

    /** 구글 페이 검증 및 주문 생성 */
    @Transactional
    public PaymentOrder verifyGooglePay(Authentication auth, GooglePayVerifyRequest req) {
        String userId = (String) auth.getPrincipal();
        String googlePaymentToken = googlePayProcessor.extractPaymentToken(req.getPaymentData());

        if (googlePaymentToken == null) {
            throw new IllegalArgumentException("결제 토큰을 찾을 수 없습니다.");
        }

        // 구글 스토어 영수증 검증
        GooglePlayValidator.GooglePurchaseInfo purchaseInfo = googlePlayValidator.validateSubscription(
                googlePaymentToken, "brickers_pro_monthly");

        if (!purchaseInfo.isValid()) {
            throw new IllegalArgumentException("유효하지 않은 결제 토큰입니다.");
        }

        // 완료된 주문 생성 및 멤버십 업그레이드
        PaymentOrder order = createCompletedOrder(userId, purchaseInfo);
        membershipService.upgradeToPro(userId);

        log.info("Google Pay integration success: User {} upgraded to PRO", userId);
        return orderRepository.save(order);
    }

    /** 내부 멤버십 적용 보조 (관리자용 등) */
    @Transactional
    public void applyMembershipPublic(ApplyMembershipRequest req) {
        membershipService.applyMembership(req.getUserId(), req.getPlanCode());
    }

    private String generateOrderNo() {
        return "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private void validateOwnership(PaymentOrder order, String userId) {
        if (!order.getUserId().equals(userId)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
    }

    private boolean isSuccessStatus(String status) {
        return List.of("SUCCESS", "COMPLETED", "DONE").contains(status);
    }

    private PaymentOrder createCompletedOrder(String userId, GooglePlayValidator.GooglePurchaseInfo info) {
        return PaymentOrder.builder()
                .orderNo("GPAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .userId(userId)
                .pgOrderId(info.getOrderId())
                .planCode("PRO_MONTHLY")
                .planName("PRO Membership (Google Pay)")
                .amount(new java.math.BigDecimal("10.00"))
                .status(PaymentStatus.COMPLETED)
                .pgProvider("GOOGLE_PAY")
                .createdAt(LocalDateTime.now())
                .paidAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
