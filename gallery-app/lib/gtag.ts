export const GA_TRACKING_ID = process.env['NEXT_PUBLIC_GA_ID'] || "";
// if (typeof window !== "undefined") {
//     console.log(`📡 [GA4] Tracking ID loaded: ${GA_TRACKING_ID}`);
// }

// gtag.js 이벤트 수집 문서
export const pageview = (url: string) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            page_path: url,
            debug_mode: false,
        });
    }
};

// gtag.js 이벤트 수집 문서
export const event = ({ action, category, label, value, ...rest }: {
    action: string;
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
}) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", action, {
            event_category: category,
            event_label: label,
            value: value,
            ...rest,
        });
    }
};

/**
 * 로그인한 사용자의 ID를 GA4에 설정합니다.
 */
export const setUserId = (userId: string | null) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_TRACKING_ID, {
            user_id: userId,
            debug_mode: false,
        });
    }
};

/**
 * 사용자 속성(User Properties)을 한 번에 설정합니다.
 * ga4_custom_definition_guide.md에 정의된 속성에 대응합니다.
 */
export const setUserProperties = (properties: {
    membership_status?: "Free" | "Premium" | "Pro";
    total_generated_count?: number;
    preferred_theme?: string;
    last_event_participation?: string;
    total_pdf_downloads?: number;
    [key: string]: any;
}) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("set", "user_properties", properties);
    }
};

/**
 * 브릭 생성 라이프사이클 추적
 */
export const trackGeneration = (status: "start" | "success" | "fail", params: {
    job_id: string;
    age?: string;
    image_category?: string;
    stability_score?: number;
    wait_time?: number;
    est_cost?: number;
    token_count?: number; // 신규
    error_type?: string;
    brick_count?: number;
    [key: string]: any;
}) => {
    event({
        action: `generate_${status}`,
        category: "Generation",
        label: params.job_id,
        ...params
    });
};

/**
 * 게이미피케이션(미니게임) 추적
 */
export const trackGameAction = (action: "game_start" | "game_complete" | "game_exit", params: {
    game_difficulty?: string;
    game_moves?: number;
    wait_time_at_moment?: number;
    [key: string]: any;
}) => {
    event({
        action: action,
        category: "Gamification",
        ...params
    });
};

/**
 * 트렌드 및 사용자 피드백 추적
 */
export const trackUserFeedback = (params: {
    action: "search" | "rate" | "download" | "share";
    search_term?: string;
    star_rating?: number;
    job_id?: string;
    [key: string]: any;
}) => {
    const { action, ...rest } = params;
    event({
        action: `user_${action}`,
        category: "Feedback",
        ...rest
    });
};

export const trackFunnel = (stage: "01_visit_landing" | "02_click_start" | "03_upload_image" | "04_generate_request" | "05_generate_success" | "06_view_result" | "07_download_pdf" | "08_share", params?: any) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", `funnel_${stage}`, {
            funnel_stage: stage, // 중요: GA4 사용자 정의 차원용으로 stage를 명시적으로 전송
            ...params,
        });
    }
};

/**
 * 이탈 지점 추적 함수
 * 이벤트명: 'exit_{step}'
 */
export const trackExit = (step: string, reason?: string, params?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", `exit_${step}`, {
            exit_step: step,
            exit_reason: reason,
            ...params,
        });
    }
};
