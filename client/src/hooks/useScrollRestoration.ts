import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "wouter";

/**
 * Per-route scroll restoration for the app's main scroll container.
 *
 * Why this exists: the app scrolls inside the `<main overflow-auto>` element in
 * CRMLayout (the window itself never scrolls), so the previous `window.scrollY`
 * based logic never worked. This hook remembers the scroll position of the
 * actual container per route path and restores it when you return.
 *
 * Behaviour:
 * - New page (never visited) → starts at the top.
 * - Page you've scrolled before → returns to where you left off.
 *
 * It is mounted once, in CRMLayout, so every authenticated page benefits and the
 * Login page (which has no CRMLayout) is intentionally unaffected.
 */
const scrollPositions = new Map<string, number>();

export function useScrollRestoration(ref: React.RefObject<HTMLElement | null>) {
  const [location] = useLocation();

  // Continuously remember the latest scroll position for this route (rAF-throttled).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scrollPositions.set(location, el.scrollTop);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location, ref]);

  // Restore the saved position when the route changes (0 for first-time routes).
  // Content may still be streaming in, so retry for a few frames until the
  // container is tall enough to actually reach the target.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const target = scrollPositions.get(location) ?? 0;
    if (target === 0) {
      el.scrollTop = 0;
      return;
    }

    let attempts = 0;
    let raf = 0;
    const restore = () => {
      const node = ref.current;
      if (!node) return;
      node.scrollTop = target;
      attempts += 1;
      const reached = Math.abs(node.scrollTop - target) <= 2;
      if (!reached && attempts < 20) {
        raf = requestAnimationFrame(restore);
      }
    };
    raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [location, ref]);
}
