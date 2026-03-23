package com.brickers.backend.analytics.service;

import com.google.analytics.data.v1beta.BetaAnalyticsDataClient;
import com.google.analytics.data.v1beta.BetaAnalyticsDataSettings;
import com.google.auth.oauth2.ServiceAccountCredentials;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 🔌 GA 클라이언트 제공자
 *
 * 구글 서버와의 '연결'만을 전담하는 유틸리티 클래스입니다.
 * application.yml 에 있는 자격증명(credentials)을 가져와서
 * 실제 구글 애널리틱스 통신용 객체(BetaAnalyticsDataClient)를 하나만 생성해두고,
 * 다른 서비스들(Basic, Intelligence, AgentReport)이 이를 빌려 쓰도록 제공합니다.
 */
@Slf4j
@Component
public class GaClientProvider {

    @Getter
    @Value("${google.analytics.property-id}")
    private String propertyId;

    @Value("${google.analytics.credentials-json}")
    private String credentialsJson;

    @Getter
    private BetaAnalyticsDataClient analyticsDataClient;

    @PostConstruct
    public void init() throws IOException {
        if (credentialsJson == null || credentialsJson.isEmpty()) {
            log.warn("GA4 자격증명을 찾을 수 없습니다. 애널리틱스 기능이 비활성화됩니다.");
            return;
        }

        ServiceAccountCredentials credentials = ServiceAccountCredentials.fromStream(
                new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8)));

        BetaAnalyticsDataSettings settings = BetaAnalyticsDataSettings.newBuilder()
                .setCredentialsProvider(() -> credentials)
                .build();

        this.analyticsDataClient = BetaAnalyticsDataClient.create(settings);
        log.info("GaClientProvider에서 GA4 Analytics Data Client 초기화 완료");
    }
}
