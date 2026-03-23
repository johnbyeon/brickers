package com.brickers.backend.billing.service;

import com.brickers.backend.billing.dto.BillingPlanResponse;
import com.brickers.backend.billing.dto.SubscriptionResponse;
import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.payment.entity.PaymentPlan;
import org.springframework.stereotype.Component;

/**
 * 🗺️ 빌링 매퍼
 * 
 * 엔티티와 DTO 간의 데이터 변환 및
 * Google Product ID와 내부 플랜 코드 간의 매핑을 전담합니다.
 */
@Component
public class BillingMapper {

    /**
     * Google Play 상품 ID -> 내부 플랜 코드 매핑
     */
    public String mapFromGoogleProductId(String productId) {
        return switch (productId) {
            case "brickers_pro_monthly" -> "PRO_MONTHLY";
            case "brickers_pro_yearly" -> "PRO_YEARLY";
            default -> throw new IllegalArgumentException("알 수 없는 상품 ID: " + productId);
        };
    }

    /**
     * 내부 플랜 코드 -> Google Play 상품 ID 매핑
     */
    public String mapToGoogleProductId(String planCode) {
        return switch (planCode) {
            case "PRO_MONTHLY" -> "brickers_pro_monthly";
            case "PRO_YEARLY" -> "brickers_pro_yearly";
            default -> null; // 신규 요금제는 Google Play에 아직 등록되지 않았을 수 있음
        };
    }

    /**
     * 결제 플랜 엔티티 -> 플랜 조회 응답 DTO
     */
    public BillingPlanResponse toPlanResponse(PaymentPlan plan) {
        return BillingPlanResponse.from(plan);
    }

    /**
     * 구독 엔티티 -> 구독 정보 응답 DTO
     */
    public SubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        if (subscription == null)
            return null;
        return SubscriptionResponse.from(subscription);
    }
}
