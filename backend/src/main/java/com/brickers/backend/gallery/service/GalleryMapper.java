package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.GalleryCreateRequest;
import com.brickers.backend.gallery.dto.GalleryResponse;
import com.brickers.backend.gallery.dto.GalleryUpdateRequest;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryBookmarkRepository;
import com.brickers.backend.gallery.repository.GalleryReactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * GalleryPostEntity를 GalleryResponse DTO로 변환하는 로직을 담당합니다.
 * 북마크 상태와 사용자의 리액션 정보 조회도 함께 처리합니다.
 */
@Component
@RequiredArgsConstructor
public class GalleryMapper {

    private final GalleryBookmarkRepository galleryBookmarkRepository;
    private final GalleryReactionRepository galleryReactionRepository;
    private final GalleryLevelResolver levelResolver;
    private final GalleryHelper galleryHelper;

    /**
     * DTO를 기반으로 새로운 GalleryPostEntity를 생성합니다.
     */
    public GalleryPostEntity toEntity(GalleryCreateRequest req, String authorId, String nickname, String profileImage) {
        LocalDateTime now = LocalDateTime.now();
        return GalleryPostEntity.builder()
                .jobId(req.getJobId())
                .authorId(authorId)
                .authorNickname(nickname)
                .authorProfileImage(profileImage)
                .title(req.getTitle().trim())
                .content(req.getContent())
                .tags(req.getTags())
                .thumbnailUrl(galleryHelper.normalizeUrlOrNull(req.getThumbnailUrl()))
                .ldrUrl(galleryHelper.normalizeUrlOrNull(req.getLdrUrl()))
                .sourceImageUrl(galleryHelper.normalizeUrlOrNull(req.getSourceImageUrl()))
                .glbUrl(galleryHelper.normalizeUrlOrNull(req.getGlbUrl()))
                .parts(req.getParts())
                .imageCategory(req.getImageCategory())
                .backgroundUrl(galleryHelper.normalizeUrlOrNull(req.getBackgroundUrl()))
                .screenshotUrls(req.getScreenshotUrls())
                .visibility(req.getVisibility() == null ? Visibility.PUBLIC : req.getVisibility())
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * 요청 정보를 바탕으로 기존 엔티티의 필드를 업데이트합니다.
     */
    public void updateFromRequest(GalleryPostEntity post, GalleryUpdateRequest req) {
        if (req.getTitle() != null) {
            galleryHelper.validateTitle(req.getTitle());
            post.setTitle(req.getTitle().trim());
        }
        if (req.getContent() != null)
            post.setContent(req.getContent());
        if (req.getTags() != null)
            post.setTags(req.getTags());
        if (req.getThumbnailUrl() != null)
            post.setThumbnailUrl(galleryHelper.normalizeUrlOrNull(req.getThumbnailUrl()));
        if (req.getLdrUrl() != null)
            post.setLdrUrl(galleryHelper.normalizeUrlOrNull(req.getLdrUrl()));
        if (req.getSourceImageUrl() != null)
            post.setSourceImageUrl(galleryHelper.normalizeUrlOrNull(req.getSourceImageUrl()));
        if (req.getGlbUrl() != null)
            post.setGlbUrl(galleryHelper.normalizeUrlOrNull(req.getGlbUrl()));
        if (req.getVisibility() != null)
            post.setVisibility(req.getVisibility());

        post.setUpdatedAt(LocalDateTime.now());
    }

    /**
     * 엔티티를 응답 DTO로 변환합니다.
     */
    public GalleryResponse toResponse(GalleryPostEntity post, String userId) {
        Boolean bookmarked = null;
        String myReaction = null;

        if (userId != null) {
            bookmarked = galleryBookmarkRepository.findByUserIdAndPostId(userId, post.getId()).isPresent();
            myReaction = galleryReactionRepository.findByUserIdAndPostId(userId, post.getId())
                    .map(r -> r.getType().name()).orElse(null);
        }

        return GalleryResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(post.getAuthorNickname())
                .authorProfileImage(post.getAuthorProfileImage())
                .title(post.getTitle())
                .content(post.getContent())
                .tags(post.getTags())
                .thumbnailUrl(post.getThumbnailUrl())
                .ldrUrl(post.getLdrUrl())
                .sourceImageUrl(post.getSourceImageUrl())
                .glbUrl(post.getGlbUrl())
                .parts(post.getParts())
                .level(post.getLevel())
                .imageCategory(post.getImageCategory())
                .backgroundUrl(post.getBackgroundUrl())
                .screenshotUrls(post.getScreenshotUrls())
                .isPro(levelResolver.isProPost(post.getLevel(), post.getParts()))
                .visibility(post.getVisibility())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(Math.max(0, post.getLikeCount()))
                .dislikeCount(Math.max(0, post.getDislikeCount()))
                .viewCount(Math.max(0, post.getViewCount()))
                .commentCount(Math.max(0, post.getCommentCount()))
                .bookmarked(bookmarked)
                .myReaction(myReaction)
                .build();
    }
}
