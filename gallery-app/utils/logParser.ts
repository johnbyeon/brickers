
/**
 * 에이전트 로그 파서
 *
 * @param log - SSE에서 받은 원본 로그 문자열
 * @param t - i18n 번역 함수(예: useLanguage()에서 전달)
 * @returns 파싱에 성공하면 현지화된 메시지, 실패하면 원본 로그 문자열
 */
export function parseAgentLog(log: string, t: any): string {
    if (!log) return "";

    // 1. [STEP] 형식 파싱 (예: [brickify] ...)
    const matchBracket = log.match(/^\[(.+?)\]\s*/);
    if (matchBracket) {
        const step = matchBracket[1];
        // sse.[step] 번역이 있는지 확인
        if (step && t.sse && t.sse[step]) {
            return t.sse[step];
        }
        // 번역이 없으면 대괄호만 제거하고 나머지를 반환
        return log.replace(/^\[.*?\]\s*/, '');
    }

    // 2. Trace: node_name (STATUS) 형식 파싱
    // 예: "Trace: node_merger (SUCCESS)"
    const matchTrace = log.match(/^Trace:\s*(\w+)\s*\((.+?)\)/);
    if (matchTrace) {
        const node = matchTrace[1];
        // sse.trace.[node] 번역이 있는지 확인
        if (node && t.sse && t.sse.trace && t.sse.trace[node]) {
            return t.sse.trace[node];
        }
        // 번역이 없으면 노드명과 상태를 그대로 반환
        return `${node} (${matchTrace[2]})`;
    }

    // 기본값: 원본 로그 반환
    return log;
}
