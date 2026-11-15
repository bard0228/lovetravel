export function attachAndroidEdgeStretch(
  scrollEl: HTMLElement | null = document.scrollingElement as HTMLElement | null,
  targetEl: HTMLElement | null = document.querySelector("#app-shell") as HTMLElement | null
): () => void {
  if (!scrollEl || !targetEl) return () => {};
  let startY = 0;
  let stretch = 0;
  let activeEdge: "top" | "bottom" | null = null;
  let ignoreTouch = false;

  const applyStretch = (val: number, edge: "top" | "bottom" | null) => {
    if (!edge || val <= 0.001) {
      targetEl.style.transition = "transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)";
      targetEl.style.transform = "scaleY(1)";
      const onEnd = (ev: TransitionEvent) => {
        if (ev.propertyName === "transform" && !activeEdge) {
          targetEl.style.transform = "";
          targetEl.style.transition = "";
          targetEl.style.transformOrigin = "";
          targetEl.removeEventListener("transitionend", onEnd);
        }
      };
      targetEl.addEventListener("transitionend", onEnd);
      return;
    }
    targetEl.style.transition = "none";
    targetEl.style.transformOrigin = edge === "top" ? "top center" : "bottom center";
    const scale = 1 + Math.min(0.055, val * 0.00028);
    targetEl.style.transform = `scaleY(${scale.toFixed(4)})`;
  };

  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.target as HTMLElement | null;
    ignoreTouch = Boolean(t && t.closest("[role='dialog'], .leaflet-container"));
    if (ignoreTouch) return;
    startY = e.touches[0].clientY;
    stretch = 0;
    activeEdge = null;
  };
  const onMove = (e: TouchEvent) => {
    if (ignoreTouch || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - startY;
    const atTop = scrollEl.scrollTop <= 1;
    const atBottom = scrollEl.scrollTop + window.innerHeight >= scrollEl.scrollHeight - 2;
    if (atTop && dy > 0) {
      activeEdge = "top";
      stretch = Math.sqrt(dy) * 14;
      applyStretch(stretch, "top");
    } else if (atBottom && dy < 0) {
      activeEdge = "bottom";
      stretch = Math.sqrt(-dy) * 14;
      applyStretch(stretch, "bottom");
    } else if (activeEdge) {
      activeEdge = null;
      applyStretch(0, null);
    }
  };
  const onRelease = () => {
    ignoreTouch = false;
    if (activeEdge || stretch > 0) {
      activeEdge = null;
      stretch = 0;
      applyStretch(0, null);
    }
  };

  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onRelease, { passive: true });
  window.addEventListener("touchcancel", onRelease, { passive: true });

  return () => {
    window.removeEventListener("touchstart", onStart);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onRelease);
    window.removeEventListener("touchcancel", onRelease);
  };
}
