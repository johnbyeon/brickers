'use client';

import { useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react';

interface UseStepNavigationParams {
    isAssemblyMode: boolean;
    activeTab: 'LDR' | 'GLB';
    canNext: boolean;
    canPrev: boolean;
    setLoading: (v: boolean) => void;
    setStepIdx: Dispatch<SetStateAction<number>>;
    containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * 스텝 이동을 위한 키보드 방향키와 Shift+휠 입력을 처리합니다.
 * kids/steps/page.tsx에서 분리한 훅입니다.
 */
export default function useStepNavigation({
    isAssemblyMode,
    activeTab,
    canNext,
    canPrev,
    setLoading,
    setStepIdx,
    containerRef,
}: UseStepNavigationParams) {
    // 키보드 방향키로 스텝 이동
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!isAssemblyMode || activeTab !== 'LDR') return;
            if (e.key === 'ArrowRight' && canNext) { setLoading(true); setStepIdx(v => v + 1); }
            else if (e.key === 'ArrowLeft' && canPrev) { setLoading(true); setStepIdx(v => v - 1); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    // Shift+휠은 스텝 이동, 일반 휠은 3D 줌(OrbitControls)
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isAssemblyMode || activeTab !== 'LDR') return;
        const handleWheel = (e: WheelEvent) => {
            if (!e.shiftKey) return; // Shift 키가 아니면 줌 동작에 맡김
            e.preventDefault();
            if (e.deltaY > 0) { if (canNext) { setLoading(true); setStepIdx(v => v + 1); } }
            else { if (canPrev) { setLoading(true); setStepIdx(v => v - 1); } }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    });
}
