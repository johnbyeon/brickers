package com.brickers.backend.analytics.service;

import com.google.analytics.data.v1beta.*;
import lombok.RequiredArgsConstructor;

/**
 * 구글 애널리틱스 통신을 위한 공통 클라이언트 획득 로직과
 * 요청 빌더 등 서비스 전반에서 공통으로 쓰이는 유틸리티를 제공합니다.
 */
@RequiredArgsConstructor
public abstract class GaBaseService {

    protected final GaClientProvider clientProvider;

    protected BetaAnalyticsDataClient getClient() {
        return clientProvider.getAnalyticsDataClient();
    }

    protected String getProperty() {
        return "properties/" + clientProvider.getPropertyId();
    }

    /**
     * 날짜 필터가 기본 적용된 기본 요청 빌더를 반환합니다.
     */
    protected RunReportRequest.Builder buildBasicRequest(int days) {
        return RunReportRequest.newBuilder()
                .setProperty(getProperty())
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"));
    }

    /**
     * 특정 필드에 대한 차원 필터를 생성합니다.
     */
    protected FilterExpression createDimensionFilter(String fieldName, String value, boolean isPrefix) {
        Filter.StringFilter.Builder stringFilter = Filter.StringFilter.newBuilder().setValue(value);
        if (isPrefix) {
            stringFilter.setMatchType(Filter.StringFilter.MatchType.BEGINS_WITH);
        } else {
            stringFilter.setMatchType(Filter.StringFilter.MatchType.EXACT);
        }

        return FilterExpression.newBuilder()
                .setFilter(Filter.newBuilder()
                        .setFieldName(fieldName)
                        .setStringFilter(stringFilter))
                .build();
    }
}
