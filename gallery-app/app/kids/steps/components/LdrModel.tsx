'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import { Bounds, Center, useBounds } from "@react-three/drei";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { removeNullChildren, disposeObject3D } from "@/lib/three/threeUtils";
import { CDN_BASE, createLDrawURLModifier } from "@/lib/ldrawUrlModifier";
import { preloadPartsBundle } from "@/lib/ldrawBundleLoader";

function LdrModel({
    url,
    overrideMainLdrUrl,
    partsLibraryPath = CDN_BASE,
    ldconfigUrl = `${CDN_BASE}LDConfig.ldr`,
    onLoaded,
    onError,
    onProgress,
    customBounds,
    fitTrigger,
    noFit,
    currentStep,
    stepMode = false,
    fitMargin = 1.5,
    smoothNormals = false,
}: {
    url: string;
    overrideMainLdrUrl?: string;
    partsLibraryPath?: string;
    ldconfigUrl?: string;
    onLoaded?: (group: THREE.Group) => void;
    onError?: (e: unknown) => void;
    onProgress?: (loaded: number, total: number) => void;
    customBounds?: THREE.Box3 | null;
    fitTrigger?: string;
    noFit?: boolean;
    currentStep?: number;
    stepMode?: boolean;
    fitMargin?: number;
    smoothNormals?: boolean;
}) {
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;

    const loader = useMemo(() => {
        THREE.Cache.enabled = true;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(createLDrawURLModifier({
            mainModelUrl: url,
            overrideMainLdrUrl,
            useProxy: false,
        }));
        manager.onProgress = (_url, loaded, total) => {
            onProgressRef.current?.(loaded, total);
        };

        const l = new LDrawLoader(manager);
        l.setPartsLibraryPath(partsLibraryPath);
        l.smoothNormals = smoothNormals;
        try { (l as any).setConditionalLineMaterial(LDrawConditionalLineMaterial as any); } catch { }
        return l;
    }, [partsLibraryPath, url, overrideMainLdrUrl, smoothNormals]);

    const [group, setGroup] = useState<THREE.Group | null>(null);
    const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());

    useEffect(() => {
        let cancelled = false;
        let prev: THREE.Group | null = null;
        (async () => {
            setGroup(null);
            await preloadPartsBundle(url);
            await loader.preloadMaterials(ldconfigUrl);
            const g = await loader.loadAsync(url);
            if (cancelled) { disposeObject3D(g); return; }
            if (g) {
                removeNullChildren(g);
                g.rotation.x = Math.PI;

                // 선 숨기기(흰색 테두리)
                g.traverse((child: any) => {
                    if (child.isLineSegments) {
                        child.visible = false;
                    }
                });

                // 복원용 머티리얼 복제
                g.traverse((child: any) => {
                    if (child.isMesh) {
                        originalMaterialsRef.current.set(child.uuid, Array.isArray(child.material) ? child.material.slice() : child.material);
                    }
                });
            }
            prev = g;
            setGroup(g);
            if (g) onLoaded?.(g);
        })().catch((e) => {
            console.error("[LDraw] load failed:", e);
            onError?.(e);
        });
        return () => {
            cancelled = true;
            if (prev) disposeObject3D(prev);
            originalMaterialsRef.current.clear();
        };
    }, [url, ldconfigUrl, loader, onLoaded, onError]);

    // 스텝 모드 로직: startingBuildingStep 기준으로 그룹화하고 투명도 적용
    useLayoutEffect(() => {
        if (!group) return;

        // stepMode가 아니면 전체가 보이도록 보장
        if (!stepMode || currentStep === undefined) {
            group.traverse((child: any) => {
                if (child.isMesh) {
                    child.visible = true;
                    if (originalMaterialsRef.current.has(child.uuid)) {
                        (child as any).material = originalMaterialsRef.current.get(child.uuid);
                    }
                }
            });
            // 그룹 자식들도 보이도록 보장
            group.children.forEach(child => { child.visible = true; });
            return;
        }

        // 자식들을 startingBuildingStep 기준으로 그룹화
        const stepGroups: THREE.Object3D[][] = [[]];
        group.children.forEach((child) => {
            if ((child as any).userData?.startingBuildingStep && stepGroups[stepGroups.length - 1].length > 0) {
                stepGroups.push([]);
            }
            stepGroups[stepGroups.length - 1].push(child);
        });

        const currentStepIndex = currentStep - 1; // 1부터 시작하는 인덱스를 0부터 시작하도록 변환
        const activeStepsCount = stepGroups.length;

        // 현재 스텝 자식과 이전 스텝 자식을 식별
        const currentStepChildren = new Set<THREE.Object3D>(stepGroups[currentStepIndex] || []);
        const previousStepChildren = new Set<THREE.Object3D>();
        for (let i = 0; i < currentStepIndex; i++) {
            (stepGroups[i] || []).forEach(c => previousStepChildren.add(c));
        }

        group.traverse((child) => {
            // 루트 자식(group의 직계 자식) 찾기
            let rootChild = child;
            while (rootChild.parent && rootChild.parent !== group) {
                rootChild = rootChild.parent;
            }

            if (rootChild.parent !== group) return; // 발생하면 안 되는 경우

            // 가시성 결정
            const isCurrent = currentStepChildren.has(rootChild);
            const isPrevious = previousStepChildren.has(rootChild);

            if (isCurrent) {
                child.visible = true;
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                child.visible = true;
                // 투명하게 처리
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const mat = Array.isArray(originalMat) ? originalMat[0].clone() : (originalMat as THREE.Material).clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            } else {
                // 미래 스텝
                // 완전히 숨김
                child.visible = false;
                // 깊은 자식은 재귀적으로 숨겨야 할 수 있지만, 루트 자식을 숨기면 traverse로 처리됩니다.
                // 루프는 모든 하위 요소를 순회합니다.
                // 루트 자식이 숨겨지면 하위 자식도 숨겨집니다.
                // Three.js는 계층 구조를 반영합니다.
            }
        });

        // 최적화: group.children(최상위)에만 가시성 적용
        group.children.forEach(child => {
            const isCurrent = currentStepChildren.has(child);
            const isPrevious = previousStepChildren.has(child);
            child.visible = isCurrent || isPrevious;
        });

        // 보이는 메시에게만 머티리얼 적용
        group.traverse((child) => {
            if (!child.visible) return;
            // 현재 스텝 또는 이전 스텝 소속인지 확인
            let root = child;
            while (root.parent && root.parent !== group) root = root.parent;

            const isCurrent = currentStepChildren.has(root);
            const isPrevious = previousStepChildren.has(root);

            if (isCurrent) {
                if ((child as any).isMesh && originalMaterialsRef.current.has(child.uuid)) {
                    (child as any).material = originalMaterialsRef.current.get(child.uuid);
                }
            } else if (isPrevious) {
                if ((child as any).isMesh) {
                    const originalMat = originalMaterialsRef.current.get(child.uuid);
                    if (originalMat) {
                        const baseMat = Array.isArray(originalMat) ? originalMat[0] : originalMat;
                        const mat = baseMat.clone();
                        mat.transparent = true;
                        mat.opacity = 0.15;
                        mat.depthWrite = false;
                        (child as any).material = mat;
                    }
                }
            }
        });

    }, [group, currentStep, stepMode]);

    if (!group) return null;

    let boundMesh = null;
    if (customBounds) {
        const size = new THREE.Vector3();
        customBounds.getSize(size);
        const center = new THREE.Vector3();
        customBounds.getCenter(center);
        boundMesh = (
            <mesh position={[center.x, -center.y, center.z]}>
                <boxGeometry args={[size.x, size.y, size.z]} />
                <meshBasicMaterial transparent opacity={0} wireframe />
            </mesh>
        );
    }

    return (
        <Bounds fit={!noFit} clip margin={fitMargin}>
            <Center>
                <primitive object={group} />
                {boundMesh}
            </Center>
            {!noFit && <FitOnceOnLoad trigger={fitTrigger ?? ""} />}
        </Bounds>
    );
}

export function FitOnceOnLoad({ trigger }: { trigger: string }) {
    const bounds = useBounds();
    useEffect(() => {
        bounds?.refresh().fit();
    }, [bounds, trigger]);
    return null;
}

export default LdrModel;
