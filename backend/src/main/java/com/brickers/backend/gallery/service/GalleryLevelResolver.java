package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import org.springframework.stereotype.Component;

/**
 * 🧱 갤러리 레벨 판별기
 * 
 * 브릭 수(parts)를 기반으로 작품의 난이도(KidsLevel)를 판별하고,
 * Pro 여부를 판단하는 비즈니스 로직을 전담합니다.
 */
@Component
public class GalleryLevelResolver {

    /**
     * 연관된 job이 있다면 해당 레벨을 사용하고, 없다면 parts 기반으로 추론하여 엔티티에 세팅합니다.
     */
    public void resolveAndSetLevel(GalleryPostEntity post, GenerateJobRepository jobRepo) {
        if (post.getJobId() != null && !post.getJobId().isBlank()) {
            jobRepo.findById(post.getJobId())
                    .ifPresent(job -> post.setLevel(job.getLevel()));
        }
        if (post.getLevel() == null) {
            post.setLevel(inferLevelFromParts(post.getParts()));
        }
    }

    public static final int LEVEL1_MIN_PARTS = 100;
    private static final int LEVEL2_MIN_PARTS = 200;
    private static final int LEVEL3_MIN_PARTS = 300;
    private static final int PRO_MIN_PARTS = 1000;

    /**
     * 브릭 수(parts)를 기반으로 난이도(KidsLevel)를 추론합니다.
     */
    public KidsLevel inferLevelFromParts(Integer parts) {
        if (parts == null || parts < LEVEL2_MIN_PARTS) {
            return KidsLevel.LEVEL_1;
        }
        if (parts < LEVEL3_MIN_PARTS) {
            return KidsLevel.LEVEL_2;
        }
        if (parts < PRO_MIN_PARTS) {
            return KidsLevel.LEVEL_3;
        }
        return KidsLevel.PRO;
    }

    /**
     * 작품의 Pro 여부를 판별합니다.
     * (레벨이 PRO이거나 브릭 수가 기준 이상인 경우)
     */
    public boolean isProPost(KidsLevel level, Integer parts) {
        if (level == KidsLevel.PRO)
            return true;
        return parts != null && parts >= PRO_MIN_PARTS;
    }
}
