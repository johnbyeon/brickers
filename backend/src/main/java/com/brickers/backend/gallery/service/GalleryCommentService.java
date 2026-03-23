package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.CommentCreateRequest;
import com.brickers.backend.gallery.dto.CommentResponse;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GalleryCommentService {

    private final GalleryCommentRepository commentRepository;
    private final GalleryPostRepository galleryPostRepository;
    private final UserRepository userRepository;

    public Page<CommentResponse> getComments(String postId, int page, int size) {
        // 1. 게시글의 전체 댓글 조회
        java.util.List<GalleryCommentEntity> allComments = commentRepository.findByPostIdAndDeletedFalse(postId);

        // 2. 루트 댓글 필터링(parentId가 null이거나 비어 있음)
        java.util.List<GalleryCommentEntity> rootComments = allComments.stream()
                .filter(c -> c.getParentId() == null || c.getParentId().isBlank())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(java.util.stream.Collectors.toList());

        // 3. 메모리에서 페이지네이션 처리
        int start = Math.min(page * size, rootComments.size());
        int end = Math.min((page + 1) * size, rootComments.size());
        java.util.List<GalleryCommentEntity> pagedRoots = rootComments.subList(start, end);

        // 4. 자식 댓글을 포함한 응답으로 매핑
        java.util.List<CommentResponse> content = pagedRoots.stream()
                .map(root -> toResponseWithChildren(root, allComments))
                .collect(java.util.stream.Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(content, PageRequest.of(page, size), rootComments.size());
    }

    private CommentResponse toResponseWithChildren(GalleryCommentEntity root,
            java.util.List<GalleryCommentEntity> allComments) {
        CommentResponse response = toResponse(root);

        // 현재 댓글의 자식 댓글(답글) 필터링
        java.util.List<CommentResponse> children = allComments.stream()
                .filter(c -> root.getId() != null && root.getId().equals(c.getParentId()))
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .map(child -> toResponseWithChildren(child, allComments)) // 중첩 답글을 위한 재귀 호출
                .collect(java.util.stream.Collectors.toList());

        response.setChildren(children);
        return response;
    }

    public CommentResponse createComment(Authentication auth, String postId, CommentCreateRequest req) {
        String userId = auth.getName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // parent가 전달되었으면 유효성 검증
        if (req.getParentId() != null) {
            boolean parentExists = commentRepository.existsById(req.getParentId());
            if (!parentExists) {
                throw new IllegalArgumentException("부모 댓글이 존재하지 않습니다.");
            }
        }

        GalleryCommentEntity comment = GalleryCommentEntity.builder()
                .postId(postId)
                .authorId(userId)
                .parentId((req.getParentId() == null || req.getParentId().isBlank()) ? null : req.getParentId().trim())
                .authorNickname(user.getNickname())
                .authorProfileImage(user.getProfileImage())
                .content(req.getContent())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        GalleryCommentEntity saved = commentRepository.save(comment);

        // 게시글 댓글 수 갱신
        galleryPostRepository.findById(postId).ifPresent(post -> {
            post.setCommentCount(post.getCommentCount() + 1);
            galleryPostRepository.save(post);
        });

        return toResponse(saved);
    }

    public void deleteComment(Authentication auth, String commentId) {
        String userId = auth.getName();
        GalleryCommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!comment.getAuthorId().equals(userId) && !isAdmin) {
            throw new SecurityException("본인의 댓글만 삭제할 수 있습니다.");
        }

        comment.setDeleted(true);
        comment.setUpdatedAt(LocalDateTime.now());
        commentRepository.save(comment);

        // 게시글 댓글 수 갱신
        galleryPostRepository.findById(comment.getPostId()).ifPresent(post -> {
            post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
            galleryPostRepository.save(post);
        });
    }

    public long getCommentCount(String postId) {
        return commentRepository.countByPostIdAndDeletedFalse(postId);
    }

    private CommentResponse toResponse(GalleryCommentEntity entity) {
        return CommentResponse.builder()
                .id(entity.getId())
                .postId(entity.getPostId())
                .authorId(entity.getAuthorId())
                .authorNickname(entity.getAuthorNickname())
                .authorProfileImage(entity.getAuthorProfileImage())
                .content(entity.getContent())
                .parentId(entity.getParentId()) // parentId 매핑
                .children(new java.util.ArrayList<>()) // 빈 children 초기화
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
