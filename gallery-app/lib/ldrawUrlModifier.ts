export const CDN_BASE = "https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/";

/**
 * 파일명이 LDraw 프리미티브 파일인지 판별합니다.
 */
function isPrimitive(filename: string): boolean {
    return /^\d+-\d+/.test(filename) ||
        /^(stug|rect|box|cyli|disc|edge|ring|ndis|con|rin|tri|stud|empty)/.test(filename);
}

/**
 * 파일명이 LDraw 서브파트 파일인지 판별합니다.
 */
function isSubpart(filename: string): boolean {
    return /^\d+s\d+\.dat$/i.test(filename);
}

/**
 * 파일 유형(프리미티브, 서브파트, 일반 파트)에 따라
 * 주어진 URL의 LDraw CDN 경로를 보정합니다.
 */
function fixLDrawPath(fixed: string, filename: string): string {
    const prim = isPrimitive(filename);
    const sub = isSubpart(filename);

    // 잘못 조합된 경로를 보정
    fixed = fixed.replace("/ldraw/models/p/", "/ldraw/p/");
    fixed = fixed.replace("/ldraw/models/parts/", "/ldraw/parts/");
    fixed = fixed.replace("/ldraw/p/parts/s/", "/ldraw/parts/s/");
    fixed = fixed.replace("/ldraw/p/parts/", "/ldraw/parts/");
    fixed = fixed.replace("/ldraw/p/s/", "/ldraw/parts/s/");
    fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

    // 프리미티브가 잘못된 디렉터리에 있으면 /p/로 이동
    if (prim && fixed.includes("/ldraw/parts/") && !fixed.includes("/parts/s/")) {
        fixed = fixed.replace("/ldraw/parts/", "/ldraw/p/");
    }
    // 서브파트가 잘못된 디렉터리에 있으면 /parts/s/로 이동
    if (sub && fixed.includes("/ldraw/p/") && !fixed.includes("/p/48/") && !fixed.includes("/p/8/")) {
        fixed = fixed.replace("/ldraw/p/", "/ldraw/parts/s/");
    }
    // 경로가 전혀 없으면 적절한 경로를 추가
    if (!fixed.includes("/parts/") && !fixed.includes("/p/")) {
        if (sub) fixed = fixed.replace("/ldraw/", "/ldraw/parts/s/");
        else if (prim) fixed = fixed.replace("/ldraw/", "/ldraw/p/");
        else fixed = fixed.replace("/ldraw/", "/ldraw/parts/");
    }

    return fixed;
}

export interface LDrawURLModifierOptions {
    /** 설정하면 메인 모델 URL 요청을 이 URL로 대신 리디렉션합니다. */
    overrideMainLdrUrl?: string;
    /** 원본 메인 모델 URL입니다. 리디렉션 대상을 감지할 때 사용합니다. */
    mainModelUrl?: string;
    /** CDN URL을 /api/proxy/ldr를 통해 프록시할지 여부입니다. 기본값은 true입니다. */
    useProxy?: boolean;
}

/**
 * THREE.LoadingManager용 URL 수정 함수를 생성합니다.
 * LDraw 경로 해석, 대소문자 정규화, 선택적 CDN 프록시 처리를 담당합니다.
 */
export function createLDrawURLModifier(options: LDrawURLModifierOptions = {}): (url: string) => string {
    const { overrideMainLdrUrl, mainModelUrl, useProxy = true } = options;

    // 리디렉션 매칭용 메인 모델 절대 URL을 미리 계산
    const mainAbs = mainModelUrl ? (() => {
        try { return new URL(mainModelUrl, typeof window !== 'undefined' ? window.location.href : '').href; }
        catch { return mainModelUrl; }
    })() : null;

    return (u: string): string => {
        let fixed = u.replace(/\\/g, "/");

        // 실수로 중복된 경로 세그먼트를 정규화
        fixed = fixed.replace("/ldraw/p/p/", "/ldraw/p/");
        fixed = fixed.replace("/ldraw/parts/parts/", "/ldraw/parts/");

        // 요청 시 메인 모델 URL을 덮어씀
        if (overrideMainLdrUrl && mainAbs) {
            try {
                const abs = new URL(fixed, window.location.href).href;
                if (abs === mainAbs) return overrideMainLdrUrl;
            } catch { /* 무시 */ }
        }

        // overrideMainLdrUrl 사용 시 상대 URL을 해석
        if (overrideMainLdrUrl && mainModelUrl) {
            const isAbsolute = fixed.startsWith("http") || fixed.startsWith("blob:") || fixed.startsWith("/") || fixed.includes(":");
            if (!isAbsolute) {
                try { fixed = new URL(fixed, mainModelUrl).href; } catch { /* 무시 */ }
            }
        }

        // LDraw 라이브러리 URL 처리
        const lowerFixed = fixed.toLowerCase();
        if (lowerFixed.includes("ldraw-parts-library") && lowerFixed.endsWith(".dat") && !lowerFixed.includes("ldconfig.ldr")) {
            const filename = fixed.split("/").pop() || "";

            // 파일명을 소문자로 정규화
            const lowerName = filename.toLowerCase();
            if (filename && lowerName !== filename) {
                fixed = fixed.slice(0, fixed.length - filename.length) + lowerName;
            }

            fixed = fixLDrawPath(fixed, filename);
        }

        // CDN URL을 프록시 처리
        if (useProxy && fixed.startsWith(CDN_BASE)) {
            return `/api/proxy/ldr?url=${encodeURIComponent(fixed)}`;
        }

        return fixed;
    };
}
