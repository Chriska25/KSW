/** Intervalle qui n'exécute le callback que si l'onglet est visible (évite les timeouts en arrière-plan). */
export function onVisibleInterval(callback: () => void, intervalMs: number): () => void {
  const tick = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    callback();
  };

  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
