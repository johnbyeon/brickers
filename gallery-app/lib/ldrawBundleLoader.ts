import * as THREE from "three";
import { CDN_BASE } from "@/lib/ldrawUrlModifier";

/**
 * LDraw 파트 번들을 THREE.Cache에 미리 적재합니다.
 *
 * LDR URL에서 파일명을 `parts-bundle.json`으로 바꿔
 * 번들 URL을 계산합니다(같은 S3 디렉터리).
 *
 * 번들이 존재하면 모든 파트 내용을 CDN URL 키와 프록시 URL 키 양쪽으로
 * THREE.Cache에 주입합니다.
 * 이렇게 하면 LDrawLoader가 개별 HTTP 요청 대신 캐시를 사용합니다.
 *
 * @returns 번들 로드에 성공하면 true, 없으면 false(404 시 CDN으로 대체)
 */
export async function preloadPartsBundle(ldrUrl: string): Promise<boolean> {
    if (!ldrUrl) return false;

    // S3가 아닌 URL(blob URL, 프록시 URL 등)은 건너뜀
    if (ldrUrl.startsWith("blob:") || ldrUrl.startsWith("/") || !ldrUrl.includes("amazonaws.com")) {
        return false;
    }

    const bundleUrl = ldrUrl.replace(/\/[^/]+$/, "/parts-bundle.json");

    try {
        const res = await fetch(bundleUrl);
        if (!res.ok) return false; // 404면 번들이 없는 기존 모델로 간주

        const bundle: {
            version: number;
            ldconfig: string;
            parts: Record<string, string>;
        } = await res.json();

        THREE.Cache.enabled = true;

        // 각 파트를 CDN URL 키와 프록시 URL 키 양쪽으로 캐시에 주입
        for (const [relPath, content] of Object.entries(bundle.parts)) {
            const cdnUrl = CDN_BASE + relPath;
            const proxyUrl = `/api/proxy/ldr?url=${encodeURIComponent(cdnUrl)}`;
            THREE.Cache.add(cdnUrl, content);
            THREE.Cache.add(proxyUrl, content);
        }

        // LDConfig.ldr 주입
        if (bundle.ldconfig) {
            const ldconfigCdn = CDN_BASE + "LDConfig.ldr";
            const ldconfigProxy = `/api/proxy/ldr?url=${encodeURIComponent(ldconfigCdn)}`;
            THREE.Cache.add(ldconfigCdn, bundle.ldconfig);
            THREE.Cache.add(ldconfigProxy, bundle.ldconfig);
        }

        console.log(`[LDraw Bundle] Loaded ${Object.keys(bundle.parts).length} parts from bundle`);
        return true;
    } catch (e) {
        console.warn("[LDraw Bundle] Failed to load bundle, falling back to CDN:", e);
        return false;
    }
}
