/** Exécute une tâche non critique après le rendu initial (LCP). */
export function runWhenIdle(task: () => void, timeoutMs = 2500): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }
  globalThis.setTimeout(task, 120);
}
