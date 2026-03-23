package com.brickers.backend.gallery.service;

import com.brickers.backend.job.entity.KidsLevel;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * 🛠️ 갤러리 헬퍼
 * 
 * 갤러리 서비스에서 사용하는 공통 검증 및 유틸리티 로직을 전담합니다.
 */
@Component
public class GalleryHelper {

    /**
     * 정렬 조건을 포함한 PageRequest를 생성합니다.
     */
    public PageRequest createPageRequest(int page, int size, String sort) {
        String s = (sort == null) ? "latest" : sort.trim().toLowerCase();
        return switch (s) {
            case "views" -> PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "viewCount", "createdAt"));
            case "likes" -> PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "likeCount", "createdAt"));
            case "popular" ->
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "likeCount", "viewCount", "createdAt"));
            default -> PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        };
    }

    /**
     * 제목의 유효성을 검증합니다.
     */
    public void validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("title은 필수이며 비어 있을 수 없습니다.");
        }
        if (title.trim().length() > 50) {
            throw new IllegalArgumentException("title은 50자 이하여야 합니다.");
        }
    }

    /**
     * URL을 정규화합니다. (http/https로 시작하지 않으면 null 반환)
     */
    public String normalizeUrlOrNull(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }
        String u = url.trim();
        return (u.startsWith("http://") || u.startsWith("https://")) ? u : null;
    }

    /**
     * 문자열 기반의 레벨을 KidsLevel 열거형으로 파싱합니다.
     */
    public KidsLevel parseLevel(String level) {
        if (level == null || level.isBlank()) {
            return null;
        }
        return switch (level.trim().toLowerCase()) {
            case "l1", "level1", "level-1", "1" -> KidsLevel.LEVEL_1;
            case "l2", "level2", "level-2", "2" -> KidsLevel.LEVEL_2;
            case "l3", "level3", "level-3", "3" -> KidsLevel.LEVEL_3;
            case "pro" -> KidsLevel.PRO;
            default -> null;
        };
    }
}
