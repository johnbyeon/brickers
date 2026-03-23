'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * frameloop="demand" Canvas를 고정 FPS로 구동합니다.
 * 렌더링 상한을 두려면 <Canvas frameloop="demand"> 내부에 배치합니다.
 * useFrame은 렌더 시점에만 실행되고 스스로 루프를 유지하지 못하므로
 * setInterval로 invalidate()를 계속 호출합니다.
 * 기본값은 24fps이며 3D 모델 보기와 배경 애니메이션에 충분합니다.
 */
export default function ThrottledDriver({ fps = 24 }: { fps?: number }) {
    const { invalidate } = useThree();

    useEffect(() => {
        const ms = 1000 / fps;
        const id = setInterval(() => invalidate(), ms);
        return () => clearInterval(id);
    }, [fps, invalidate]);

    return null;
}
