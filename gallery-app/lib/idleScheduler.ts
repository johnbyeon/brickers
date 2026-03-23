type IdleHandle = number;

export function scheduleIdleWork(
  callback: () => void,
  options?: { timeout?: number }
): IdleHandle {
  if (typeof window === 'undefined') {
    return 0; // SSR에서는 아무 작업도 하지 않음
  }
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(
      () => callback(),
      options?.timeout ? { timeout: options.timeout } : undefined
    );
  }
  // 대체 수단: 50ms 지연된 setTimeout 사용(메인 스레드에 양보)
  return setTimeout(callback, 50) as unknown as IdleHandle;
}

export function cancelIdleWork(id: IdleHandle): void {
  if (typeof window === 'undefined') return;
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
