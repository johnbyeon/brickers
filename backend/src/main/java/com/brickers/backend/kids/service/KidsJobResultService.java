package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.sqs.dto.SqsMessage;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 🛠️ Kids 작업 결과 서비스
 * AI 서버나 SQS로부터 수신된 원시 데이터(Map, SqsMessage)를 해석하고,
 * 엔티티에 반영하기 적절한 형태로 가공(Parsing, 디코딩, 비용 계산)하는 기능을 전담합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KidsJobResultService {

    private final GenerateJobRepository jobRepository;
    private final StorageService storageService;

    /**
     * AI 서버 처리 결과 반영 (Map 형태 - AsyncWorker 용)
     */
    @Transactional
    public void applyResult(String jobId, String userId, Map<String, Object> response) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + jobId));

        if (response == null)
            return;

        log.info("[KidsJobResultService] AI 결과 해석 및 반영 시작 | jobId={}", jobId);

        // 1. 기초 정보 (Latency, Stats)
        if (response.get("lmmLatency") instanceof Number n)
            job.setLmmLatency(n.intValue());
        if (response.get("parts") instanceof Number n)
            job.setParts(n.intValue());
        if (response.get("finalTarget") instanceof Number n)
            job.setFinalTarget(n.intValue());
        if (response.containsKey("subject"))
            job.setTitle(asString(response.get("subject")));
        if (response.get("stabilityScore") instanceof Number n)
            job.setStabilityScore(n.intValue());

        // 2. URLs 반영
        updateJobUrls(job, response);

        // 3. Metadata (Tags, Category, Screenshots)
        if (response.get("suggestedTags") instanceof List tags)
            job.setSuggestedTags((List<String>) tags);
        if (response.get("imageCategory") != null)
            job.setImageCategory(asString(response.get("imageCategory")));
        if (response.get("screenshots") instanceof Map ss)
            job.setScreenshotUrls((Map<String, String>) ss);

        // 4. 비용 계산
        if (response.get("tokenCount") instanceof Number n)
            job.setTokenCount(n.intValue());
        if (response.get("estCost") instanceof Number n)
            job.setEstCost(n.doubleValue());
        if (job.getEstCost() == null)
            applyCostFallback(job);

        // 5. LDR Data 특수 처리 (Base64 -> S3)
        processLdrBase64(job, userId, asString(response.get("ldrData")));

        job.markDone();
        jobRepository.save(job);
        log.info("[KidsJobResultService] AI 결과 반영 완료 | jobId={}", jobId);
    }

    /**
     * SQS 결과 메시지 반영
     */
    @Transactional
    public void applySqsResult(SqsMessage result) {
        GenerateJobEntity job = jobRepository.findById(result.getJobId())
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + result.getJobId()));

        if (job.getStatus() == JobStatus.CANCELED)
            return;

        if (Boolean.TRUE.equals(result.getSuccess())) {
            job.setCorrectedImageUrl(result.getCorrectedUrl());
            job.setGlbUrl(result.getGlbUrl());
            job.setLdrUrl(result.getLdrUrl());
            if (result.getInitialLdrUrl() != null)
                job.setInitialLdrUrl(result.getInitialLdrUrl());
            job.setBomUrl(result.getBomUrl());
            if (result.getPdfUrl() != null)
                job.setPdfUrl(result.getPdfUrl());
            if (result.getParts() != null)
                job.setParts(result.getParts());
            if (result.getFinalTarget() != null)
                job.setFinalTarget(result.getFinalTarget());
            if (result.getTags() != null)
                job.setSuggestedTags(result.getTags());
            // 수정: backgroundUrl 보존. SQS RESULT에 값이 없으면 기존 값(Screenshot Server PATCH 저장값) 유지
            // 유지
            if (result.getBackgroundUrl() != null && !result.getBackgroundUrl().isBlank()) {
                job.setBackgroundUrl(result.getBackgroundUrl());
            }
            // else: 기존 job.getBackgroundUrl() 그대로 유지

            job.setTokenCount(result.getTokenCount());
            job.setEstCost(result.getEstCost());
            job.setStabilityScore(result.getStabilityScore());

            if (job.getEstCost() == null)
                applyCostFallback(job);
            job.markDone();
        } else {
            job.markFailed(result.getErrorMessage());
        }
        jobRepository.save(job);
    }

    private void updateJobUrls(GenerateJobEntity job, Map<String, Object> response) {
        String correctedUrl = asString(response.get("correctedUrl"));
        if (correctedUrl != null) {
            job.setCorrectedImageUrl(correctedUrl);
            job.setPreviewImageUrl(correctedUrl);
        }
        String modelUrl = asString(response.get("modelUrl"));
        if (modelUrl != null)
            job.setGlbUrl(modelUrl);
        String ldrUrl = asString(response.get("ldrUrl"));
        if (ldrUrl != null)
            job.setLdrUrl(ldrUrl);
        String initialLdrUrl = asString(response.get("initialLdrUrl"));
        if (initialLdrUrl != null)
            job.setInitialLdrUrl(initialLdrUrl);
        String bomUrl = asString(response.get("bomUrl"));
        if (bomUrl != null)
            job.setBomUrl(bomUrl);
        String bgUrl = asString(response.get("backgroundUrl"));
        if (bgUrl != null && !bgUrl.isBlank())
            job.setBackgroundUrl(bgUrl);
    }

    private void processLdrBase64(GenerateJobEntity job, String userId, String ldrData) {
        if (ldrData != null && ldrData.startsWith("data:")) {
            try {
                String b64 = ldrData.substring(ldrData.indexOf(',') + 1);
                byte[] bytes = Base64.getDecoder().decode(b64);
                var stored = storageService.storeFile(userId, "result.ldr", bytes, "text/plain");
                job.setLdrUrl(stored.url());
            } catch (Exception e) {
                log.warn("[KidsJobResultService] LDR base64 처리 실패: {}", e.getMessage());
            }
        }
    }

    private void applyCostFallback(GenerateJobEntity job) {
        if (job.getTokenCount() != null) {
            double total = 0.30 + (job.getTokenCount() * 0.00000015);
            job.setEstCost(Math.round(total * 10000.0) / 10000.0);
        } else {
            job.setEstCost(0.35);
        }
    }

    private String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}
