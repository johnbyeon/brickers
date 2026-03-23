package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.GalleryViewLogEntity;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.gallery.repository.GalleryViewLogRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GalleryViewService {

    private final GalleryViewLogRepository viewLogRepository;
    private final GalleryPostRepository postRepository;
    private final CurrentUserService currentUserService;
    private final MongoTemplate mongoTemplate;

    /** 조회자 식별 키를 생성합니다. */
    public String buildViewerKey(Authentication authOrNull, HttpServletRequest request) {
        if (authOrNull != null && authOrNull.isAuthenticated()
                && !"anonymousUser".equals(String.valueOf(authOrNull.getPrincipal()))) {
            User me = currentUserService.get(authOrNull);
            return "USER:" + me.getId();
        }

        String ip = extractClientIp(request);
        String ua = request.getHeader("User-Agent");
        String raw = (ip == null ? "" : ip) + "|" + (ua == null ? "" : ua);

        return "GUEST:" + sha256(raw);
    }

    /**
     * ✅ MongoDB + TTL 컬렉션 기반 24시간당 1회 조회수 증가
     * - (postId, viewerKey) 유니크로 중복 방지
     * - createdAt TTL 24시간 자동 만료 → 24시간이 지나면 다시 증가 가능
     */
    public void increaseViewIfNeeded(String postId, String viewerKey) {
        LocalDateTime now = LocalDateTime.now();

        GalleryPostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + postId));
        if (post.isDeleted())
            throw new IllegalArgumentException("삭제된 게시글입니다.");

        try {
            // ✅ insert로 명확히 "처음 본 경우만" 저장
            viewLogRepository.insert(GalleryViewLogEntity.builder()
                    .postId(postId)
                    .viewerKey(viewerKey)
                    .createdAt(now)
                    .build());

            // ✅ insert에 성공했을 때만 조회수 +1
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(postId).and("deleted").is(false)),
                    new Update().inc("viewCount", 1).set("updatedAt", now),
                    GalleryPostEntity.class);

        } catch (DuplicateKeyException e) {
            // ✅ 24시간 내 이미 본 경우는 증가시키지 않음
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank())
            return xff.split(",")[0].trim();

        String xrip = request.getHeader("X-Real-IP");
        if (xrip != null && !xrip.isBlank())
            return xrip.trim();

        return request.getRemoteAddr();
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] out = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : out)
                sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
