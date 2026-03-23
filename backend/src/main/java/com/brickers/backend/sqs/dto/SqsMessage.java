package com.brickers.backend.sqs.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * SQS 메시지 공통 구조
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SqsMessage {

    /**
     * 메시지 타입
     */
    public enum MessageType {
        REQUEST, // 백엔드 → AI 서버(작업 요청)
        RESULT // AI 서버 → 백엔드(작업 결과)
    }

    private MessageType type;
    private String jobId;
    private LocalDateTime timestamp;

    // REQUEST 필드
    private String userId;
    private String sourceImageUrl;
    private String age;
    private Integer budget;
    private String language; // 신규

    // RESULT 필드
    private Boolean success;
    private String correctedUrl;
    private String glbUrl;
    private String ldrUrl;
    private String initialLdrUrl; // 신규
    private String bomUrl;
    private String pdfUrl; // 신규: PDF URL
    private String backgroundUrl; // 배경 이미지 URL(Nano Banana)
    private Integer parts;
    private Integer finalTarget;
    private List<String> tags;
    private String errorMessage;
    private Double estCost; // 신규
    private Integer tokenCount; // 신규
    private Integer stabilityScore; // 신규
}
