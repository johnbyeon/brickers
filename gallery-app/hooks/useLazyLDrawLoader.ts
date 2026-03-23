'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 컨테이너가 뷰포트에 들어올 때까지 LDraw 3D 콘텐츠 로드를 지연합니다.
 * 컨테이너 요소에 붙일 ref와,
 * 요소가 보여 로드를 시작해야 하는지 여부를 나타내는 boolean을 반환합니다.
 */
export function useLazyLDrawLoader(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || isVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px', ...options }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [isVisible, options]);

    return { ref, isVisible };
}
