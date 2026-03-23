package com.brickers.backend.inquiry.service;

import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * 🛠️ 문의 헬퍼
 * 
 * Inquiry 서비스 관련 공통 검증 및 유틸리티 로직을 담당합니다.
 */
@Component
@RequiredArgsConstructor
public class InquiryHelper {

    private final InquiryRepository inquiryRepository;

    /**
     * 페이징 요청 객체를 생성합니다.
     */
    public Pageable createPageRequest(int page, int size, Sort sort) {
        return PageRequest.of(page, size, sort);
    }

    /**
     * 문의를 조회하고 소유권을 확인합니다.
     */
    public Inquiry findAndValidateOwner(String inquiryId, String userId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다. id=" + inquiryId));
        if (!inquiry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("해당 문의에 대한 권한이 없습니다.");
        }
        return inquiry;
    }

    /**
     * 문의를 조회합니다.
     */
    public Inquiry findInquiry(String inquiryId) {
        return inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다. id=" + inquiryId));
    }

    /**
     * 답변 등록 전 수정 가능 여부를 확인합니다.
     */
    public void validateEditable(Inquiry inquiry) {
        if (!inquiry.canEdit()) {
            throw new IllegalArgumentException("답변이 등록된 문의는 수정할 수 없습니다.");
        }
    }

    /**
     * 답변 등록 전 삭제 가능 여부를 확인합니다.
     */
    public void validateDeletable(Inquiry inquiry) {
        if (!inquiry.canDelete()) {
            throw new IllegalArgumentException("답변이 등록된 문의는 삭제할 수 없습니다.");
        }
    }
}
