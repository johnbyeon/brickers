"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import * as gtag from "@/lib/gtag";
import { useAuth } from "@/contexts/AuthContext";

declare global {
    interface Window {
        gtag: (
            command: "config" | "event" | "js" | "set",
            targetId: string,
            config?: Record<string, any>
        ) => void;
    }
}

export default function GoogleAnalytics() {
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        // 컴포넌트 초기화
    }, []);

    // 페이지 뷰 추적
    useEffect(() => {
        gtag.pageview(pathname);
    }, [pathname]);

    // 유저 ID 및 속성 추적 (로그인 상태 변화 감지)
    useEffect(() => {
        if (user?.id) {
            gtag.setUserId(user.id);
            // 닉네임과 유저 ID도 사용자 속성으로 함께 전송(GA4 사용자 정의 차원)
            gtag.setUserProperties({
                userId: user.id,
                nickname: user.nickname || "Unknown"
            });
        } else {
            gtag.setUserId(null);
            gtag.setUserProperties({
                userId: null,
                nickname: null
            });
        }
    }, [user]);

    return null;
}
