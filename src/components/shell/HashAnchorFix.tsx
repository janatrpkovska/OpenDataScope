"use client";
// Deep links to a section. The browser scrolls to the fragment
// when the page loads, but charts measure their width after hydration and change height (most on phones), which
// can leave the target off-screen or under the sticky header. Until the reader scrolls, types or taps (or for
// 2.5 s), the target is re-aligned whenever the page height changes; scroll-padding-top keeps it below the header.
import { useEffect } from "react";

const STOP_ON = ["wheel", "touchstart", "keydown", "mousedown"] as const;

export function HashAnchorFix() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !document.getElementById(id)) return;
    let frame = 0;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" }));
    };
    const ro = new ResizeObserver(align);
    ro.observe(document.body);
    const stop = () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      for (const ev of STOP_ON) window.removeEventListener(ev, stop);
    };
    for (const ev of STOP_ON) window.addEventListener(ev, stop, { passive: true });
    const timer = setTimeout(stop, 2500);
    return stop;
  }, []);
  return null;
}
