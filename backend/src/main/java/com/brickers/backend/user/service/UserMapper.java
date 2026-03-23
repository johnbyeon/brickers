package com.brickers.backend.user.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.user.dto.MyActivityResponse;
import com.brickers.backend.user.dto.MyJobResponse;
import com.brickers.backend.user.dto.MyProfileResponse;
import com.brickers.backend.user.entity.User;
import org.springframework.stereotype.Component;

/**
 * 🎨 사용자 매퍼
 * 
 * 사용자 프로필, 생성 작업(Job), 활동 내역 등 마이페이지 관련 DTO 변환을 담당합니다.
 */
@Component
public class UserMapper {

    /**
     * User 엔티티를 MyProfileResponse DTO로 변환합니다.
     */
    public MyProfileResponse toProfileResponse(User user) {
        if (user == null)
            return null;
        user.ensureDefaults();
        return MyProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .bio(user.getBio())
                .profileImage(user.getProfileImage())
                .membershipPlan(user.getMembershipPlan())
                .accountState(user.getAccountState())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * GenerateJobEntity를 MyJobResponse DTO로 변환합니다.
     */
    public MyJobResponse toJobResponse(GenerateJobEntity job) {
        if (job == null)
            return null;
        job.ensureDefaults();
        return MyJobResponse.from(job);
    }

    /**
     * 활동 내역을 MyActivityResponse DTO로 변환합니다.
     */
    public MyActivityResponse toActivityResponse(String type, Object data, java.time.LocalDateTime createdAt) {
        return MyActivityResponse.builder()
                .type(type)
                .createdAt(createdAt)
                .data(data)
                .build();
    }
}
