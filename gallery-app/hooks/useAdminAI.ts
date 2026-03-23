import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAiAnalyticsReport } from "@/lib/api/adminApi";

export interface AdminAIState {
    deepAnalyzing: boolean;
    deepReport: string | null;
    deepRisk: number;
    deepError: string | null;
    deepAnomalies: any[];
    deepActions: any[];
    deepDiagnosis: any;
    moderationResults: any[]; // 신규: 자율 조치 내역
    lastDeepAnalysisTime: string | null;
}

export function useAdminAI(activeTab: string) {
    const { authFetch } = useAuth();
    const [state, setState] = useState<AdminAIState>({
        deepAnalyzing: false,
        deepReport: null,
        deepRisk: 0,
        deepError: null,
        deepAnomalies: [],
        deepActions: [],
        deepDiagnosis: null,
        moderationResults: [],
        lastDeepAnalysisTime: null,
    });

    const [autoAnalyzeDone, setAutoAnalyzeDone] = useState(false);

    // 신규: 기존 리포트 가져오기(보다 안전한 버전)
    const handleFetchReport = useCallback(async (days: number = 7) => {
        try {
            const data = await getAiAnalyticsReport(days);
            if (data && data.report) {
                setState(prev => ({
                    ...prev,
                    deepReport: data.report,
                    lastDeepAnalysisTime: "저장된 리포트",
                }));
                return true;
            }
        } catch (e: any) {
            console.error("[useAdminAI] 기존 리포트 조회 실패:", e);
        }
        return false;
    }, []);

    const handleDeepAnalyze = useCallback(async () => {
        setState(prev => ({
            ...prev,
            deepAnalyzing: true,
            deepReport: null,
            deepError: null,
            deepAnomalies: [],
            deepActions: [],
            deepDiagnosis: null,
            moderationResults: []
        }));

        try {
            const res = await authFetch("/api/admin/analytics/ai/deep-analyze", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setState(prev => ({
                    ...prev,
                    deepReport: data.report || data.final_report || "보고서 없음",
                    deepRisk: data.risk_score ?? 0,
                    deepAnomalies: data.anomalies || [],
                    deepActions: data.proposed_actions || [],
                    deepDiagnosis: data.diagnosis || null,
                    moderationResults: data.moderation_results || [],
                    lastDeepAnalysisTime: new Date().toLocaleTimeString(),
                }));
            } else {
                const err = await res.json().catch(() => null);
                setState(prev => ({
                    ...prev,
                    deepError: err?.details || err?.error || `오류 ${res.status}`
                }));
            }
        } catch (e: any) {
            setState(prev => ({
                ...prev,
                deepError: e.message || "네트워크 오류"
            }));
        } finally {
            setState(prev => ({ ...prev, deepAnalyzing: false }));
        }
    }, [authFetch]);


    const handleRestore = useCallback(async (targetType: string, targetId: string) => {
        if (!confirm(`${targetType} 항목을 정말 복구하시겠습니까?`)) return;

        try {
            const res = await authFetch("/api/admin/moderation/restore", {
                method: "POST",
                body: JSON.stringify({ type: targetType, targetId })
            });
            if (res.ok) {
                alert("정상적으로 복구되었습니다.");
                // 로컬 상태에서 조치 상태 업데이트
                setState(prev => ({
                    ...prev,
                    moderationResults: prev.moderationResults.map(r =>
                        r.target_id === targetId ? { ...r, action_taken: 'RESTORED' } : r
                    )
                }));
            } else {
                alert("복구에 실패했습니다.");
            }
        } catch (e) {
            console.error(e);
            alert("복구 중 오류가 발생했습니다.");
        }
    }, [authFetch]);

    // 신규: 질의형 분석 상태
    const [appendedContent, setAppendedContent] = useState<string>("");
    const [isQuerying, setIsQuerying] = useState(false);

    const handleQuerySubmit = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setIsQuerying(true);
        try {
            const res = await authFetch("/api/admin/analytics/ai/query", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                const timestamp = new Date().toLocaleTimeString();
                const newAppend = `\n\n---\n\n### 💬 질의응답 (${timestamp})\n**질문: ${query}**\n\n${data.answer}`;
                setAppendedContent(prev => prev + newAppend);
            } else {
                alert("AI 응답을 받아오지 못했습니다.");
            }
        } catch (error) {
            console.error("질의 처리 실패:", error);
            alert("분석 요청 중 오류가 발생했습니다.");
        } finally {
            setIsQuerying(false);
        }
    }, [authFetch]);

    // 대시보드 진입 시 자동 분석 & 5분 주기 폴링
    const handleDeepAnalyzeRef = useRef(handleDeepAnalyze);
    handleDeepAnalyzeRef.current = handleDeepAnalyze;

    useEffect(() => {
        if (activeTab === "dashboard" && !autoAnalyzeDone && !state.deepAnalyzing) {
            // 제거됨: 자동 조회 로직은 쓰지 않고 분석 시작 버튼으로만 동작
            setAutoAnalyzeDone(true);
        }

        let interval: NodeJS.Timeout | null = null;
        if (activeTab === "dashboard" && state.deepReport) { // 수정: 리포트가 있을 때만 주기적 갱신 시작
            interval = setInterval(() => {
                if (!state.deepAnalyzing) {
                    console.log("[AI Analyst] 주기 갱신 실행...");
                    handleDeepAnalyzeRef.current();
                }
            }, 300000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab, autoAnalyzeDone, state.deepAnalyzing]);

    return {
        ...state,
        deepReport: state.deepReport ? state.deepReport + appendedContent : null, // ✅ 이어붙인 내용까지 함께 반환
        isQuerying,
        handleDeepAnalyze,
        handleRestore,
        handleQuerySubmit
    };
}
