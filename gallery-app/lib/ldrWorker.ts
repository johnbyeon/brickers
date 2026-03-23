import { parseAndProcessSteps } from "../lib/ldrUtils";

self.onmessage = async (e: MessageEvent) => {
    const { text, type } = e.data;

    if (type === "PROCESS_LDR") {
        try {
            const result = parseAndProcessSteps(text);

            // Box3/Vector3의 전송 가능한 지오메트리 데이터는
            // 별도 직렬화 없이는 쉽게 추출되지 않지만, 이 객체들은 복제로도 충분히 작습니다.
            // 다만 stepTexts는 큰 문자열 배열입니다.

            self.postMessage({
                type: "SUCCESS",
                payload: {
                    stepTexts: result.stepTexts,
                    stepOnlyTexts: result.stepOnlyTexts,
                    stepBricks: result.stepBricks,
                    sortedFullText: result.sortedFullText,
                    bounds: result.bounds ? {
                        min: result.bounds.min,
                        max: result.bounds.max
                    } : null
                }
            });
        } catch (error) {
            self.postMessage({
                type: "ERROR",
                payload: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
