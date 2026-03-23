package com.brickers.backend.inquiry.service;

import com.brickers.backend.inquiry.dto.InquiryResponse;
import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryAnswer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 🗺️ 문의 매퍼
 * 
 * Inquiry 엔티티와 DTO 간의 변환을 담당합니다.
 */
@Component
@RequiredArgsConstructor
public class InquiryMapper {

    /**
     * 엔티티를 응답 DTO로 변환합니다. 이메일은 직접 전달받거나 null일 수 있습니다.
     */
    public InquiryResponse toResponse(Inquiry inquiry, String userEmail) {
        if (inquiry == null)
            return null;

        InquiryResponse.InquiryResponseBuilder builder = InquiryResponse.builder()
                .id(inquiry.getId())
                .userId(inquiry.getUserId())
                .userEmail(userEmail)
                .title(inquiry.getTitle())
                .content(inquiry.getContent())
                .attachments(inquiry.getAttachments())
                .status(inquiry.getStatus())
                .createdAt(inquiry.getCreatedAt())
                .updatedAt(inquiry.getUpdatedAt());

        if (inquiry.getAnswer() != null) {
            InquiryAnswer ans = inquiry.getAnswer();
            builder.answer(InquiryResponse.AnswerDto.builder()
                    .content(ans.getContent())
                    .answeredBy(ans.getAnsweredBy())
                    .answeredAt(ans.getAnsweredAt())
                    .build());
        }

        return builder.build();
    }
}
