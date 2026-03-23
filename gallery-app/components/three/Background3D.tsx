'use client';

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";

// 무작위 유틸리티 함수
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const randomColor = () => {
    const colors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7", "#ec4899", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
};

// 물리 상수
const FRICTION = 0.98;
const IMPULSE_STRENGTH = 0.15;
const GRAVITY = 0.015;
const FLOOR_Y = -8;
const BOUNCE_DAMPING = 0.6;
const FLOAT_FORCE = 0.002;

type ShapeType = "standard" | "long" | "cylinder" | "circle";

type BrickProps = {
    position: [number, number, number];
    color: string;
    rotation: [number, number, number];
    scale: number;
    shape: ShapeType;
    entryDirection?: "top" | "sides" | "float";
    id?: number;
};

type BrickSeed = Omit<BrickProps, "entryDirection"> & { id: number };

// 스터드 지오메트리 헬퍼
const Stud = ({ position, color }: { position: [number, number, number]; color: string }) => (
    <mesh position={position}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
);

function Brick({
    position: initialPos,
    color,
    rotation: initialRot,
    scale,
    shape,
    entryDirection = "top",
    id,
}: BrickProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const isSides = entryDirection === "sides";
    const isFloat = entryDirection === "float";

    // 진입 방향에 따라 초기 위치 설정
    const position = useRef(
        useMemo(() => {
            if (isSides) {
                const side = Math.random() > 0.5 ? 1 : -1;
                return new THREE.Vector3(side * 35, randomRange(-5, 15), initialPos[2]);
            }
            if (isFloat) {
                return new THREE.Vector3(initialPos[0], initialPos[1], initialPos[2]);
            }
            return new THREE.Vector3(initialPos[0], initialPos[1] + 25, initialPos[2]);
        }, [initialPos, isSides, isFloat])
    );

    const velocity = useRef(
        useMemo(() => {
            if (isSides) {
                const xDir = position.current.x > 0 ? -1 : 1;
                return new THREE.Vector3(xDir * randomRange(0.2, 0.5), randomRange(0.2, 0.5), 0);
            }
            if (isFloat) {
                return new THREE.Vector3(
                    randomRange(-0.02, 0.02),
                    randomRange(0.01, 0.05),
                    randomRange(-0.02, 0.02)
                );
            }
            return new THREE.Vector3(0, -randomRange(0.1, 0.3), 0);
        }, [isSides, isFloat])
    );

    const angularVelocity = useRef(
        new THREE.Vector3(randomRange(-0.1, 0.1), randomRange(-0.1, 0.1), randomRange(-0.1, 0.1))
    );

    // 물리 상태
    const isSettled = useRef(isFloat);
    const floatOffset = useRef(randomRange(0, Math.PI * 2)); // 사인파용 임의 위상

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const pos = position.current;
        const vel = velocity.current;
        const rot = meshRef.current.rotation;
        const angVel = angularVelocity.current;

        if (!isSettled.current) {
            // 낙하 상태
            vel.y -= GRAVITY; // 중력
            pos.add(vel); // 이동

            // 바닥 충돌
            if (pos.y < FLOOR_Y) {
                pos.y = FLOOR_Y;
                vel.y = -vel.y * BOUNCE_DAMPING;
                vel.x += randomRange(-0.05, 0.05);
                vel.z += randomRange(-0.05, 0.05);

                angVel.x = randomRange(-0.2, 0.2);
                angVel.z = randomRange(-0.2, 0.2);

                // 반동이 충분히 작아지면 정착/부유 상태로 전환
                if (Math.abs(vel.y) < 0.1 && Math.abs(vel.x) < 0.1) {
                    isSettled.current = true;
                    // 큰 하강 속도는 초기화하고 부유 시작용 약한 드리프트만 유지
                    vel.set(randomRange(-0.02, 0.02), randomRange(0.01, 0.03), randomRange(-0.02, 0.02));
                    angVel.set(randomRange(-0.01, 0.01), randomRange(-0.01, 0.01), randomRange(-0.01, 0.01));
                }
            }
        } else {
            // 부유 / 무중력 상태

            // 1. 속도에 따라 이동(드리프트)
            pos.add(vel);

            // 2. 드래그(마찰)를 적용해 충격을 서서히 줄임
            vel.multiplyScalar(FRICTION);

            // 3. 사인파 기반 유휴 움직임 추가(상하 진동)
            // 위치나 속도에 직접 더할 수 있는데,
            // 속도에 작은 힘을 더하면 더 부드러운 드리프트가 만들어짐
            const time = state.clock.elapsedTime;
            vel.y += Math.sin(time + floatOffset.current) * 0.0005;
            vel.x += Math.cos(time * 0.5 + floatOffset.current) * 0.0002;

            // 4. 천천히 회전
            rot.x += angVel.x;
            rot.y += angVel.y;
            rot.z += angVel.z;
            angVel.multiplyScalar(0.99); // 시간이 지나며 회전 속도 감소

            // 5. 경계 내부 유지(보이지 않는 벽에 튕김)
            // X 경계
            if (pos.x > 25 || pos.x < -25) {
                vel.x = -vel.x * 0.8;
                pos.x = Math.max(-25, Math.min(25, pos.x));
            }
            // Y 경계(무중력 상태의 천장과 바닥)
            if (pos.y > 15 || pos.y < FLOOR_Y) {
                vel.y = -vel.y * 0.8;
                pos.y = Math.max(FLOOR_Y, Math.min(15, pos.y));
            }
            // Z 경계
            if (pos.z > 0 || pos.z < -20) {
                vel.z = -vel.z * 0.8;
                pos.z = Math.max(-20, Math.min(0, pos.z));
            }
        }

        // 물리 계산과 낙하 상태를 시각 회전에 반영
        if (!isSettled.current) {
            rot.x += angVel.x;
            rot.y += angVel.y;
            rot.z += angVel.z;
        }

        meshRef.current.position.copy(pos);
    });

    const onHover = () => {
        // 충격량 적용
        velocity.current.add(new THREE.Vector3(
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH),
            randomRange(IMPULSE_STRENGTH * 0.5, IMPULSE_STRENGTH), // Slight upward bias
            randomRange(-IMPULSE_STRENGTH, IMPULSE_STRENGTH)
        ));

        // 회전 충격 추가
        angularVelocity.current.add(new THREE.Vector3(
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1),
            randomRange(-0.1, 0.1)
        ));

        // 아직 낙하 중이어도 강제로 부유 상태로 바꾸지 않고 물리 계산에 맡깁니다.
        // 낙하 중이면 중력이 대부분의 충격을 상쇄하고,
        // 부유 중이면 이 충격으로 주변을 떠다니게 됩니다.
    };

    const renderGeometry = () => {
        switch (shape) {
            case "long":
                return (
                    <>
                        <boxGeometry args={[2, 1, 1]} />
                        <Stud position={[0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, 0.25]} color={color} />
                        <Stud position={[0.5, 0.6, -0.25]} color={color} />
                        <Stud position={[-0.5, 0.6, -0.25]} color={color} />
                    </>
                );

            case "cylinder":
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                        <Stud position={[0, 0.6, 0]} color={color} />
                    </>
                );

            case "circle":
                return (
                    <>
                        <cylinderGeometry args={[0.5, 0.5, 0.4, 32]} />
                        <Stud position={[0, 0.3, 0]} color={color} />
                    </>
                );

            case "standard":
            default:
                return (
                    <>
                        <boxGeometry args={[1, 1, 1]} />
                        <Stud position={[0.25, 0.6, 0.25]} color={color} />
                        <Stud position={[-0.25, 0.6, 0.25]} color={color} />
                        <Stud position={[0.25, 0.6, -0.25]} color={color} />
                        <Stud position={[-0.25, 0.6, -0.25]} color={color} />
                    </>
                );
        }
    };

    return (
        <mesh ref={meshRef} rotation={initialRot} scale={scale} onPointerOver={onHover}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            {renderGeometry()}
        </mesh>
    );
}

export default function Background3D({
    entryDirection = "top",
}: {
    entryDirection?: "top" | "sides" | "float";
}) {
    const brickCount = 40;
    const shapes: ShapeType[] = ["standard", "long", "cylinder", "circle"];
    const randomShape = () => shapes[Math.floor(Math.random() * shapes.length)];

    const bricks = useMemo<BrickSeed[]>(() => {
        return Array.from({ length: brickCount }).map((_, i) => ({
            id: i,
            position: [randomRange(-15, 15), randomRange(-10, 10), randomRange(-5, -20)],
            rotation: [randomRange(0, Math.PI), randomRange(0, Math.PI), 0],
            color: randomColor(),
            scale: randomRange(0.8, 1.5),
            shape: randomShape(),
        }));
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                background: "#fff",
                overflow: "hidden",
                pointerEvents: "auto",
            }}
        >
            <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <directionalLight position={[-5, 5, 5]} intensity={1} />

                {bricks.map(({ id, ...props }) => (
                    <Brick key={id} id={id} {...props} entryDirection={entryDirection} />
                ))}

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
