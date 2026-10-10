"use client";
// Intentional sideways-scroll region for a table with a sticky first column.
// Keyboard users can scroll it (tabIndex 0). When focus moves to a control that
// sits partly behind the sticky first column (e.g. Shift+Tab towards the left), the region scrolls just enough
// to show it: WCAG 2.2 SC 2.4.11 Focus Not Obscured. Browsers do not do this reliably from scroll-padding alone.
import type { FocusEvent, ReactNode } from "react";

export function StickyScrollRegion({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const region = e.currentTarget;
    const el = e.target as HTMLElement;
    if (el === region || el.closest("th.sticky")) return;
    const sticky = region.querySelector<HTMLElement>("th.sticky");
    if (!sticky) return;
    const edge = sticky.getBoundingClientRect().right + 4;
    const left = el.getBoundingClientRect().left;
    if (left < edge) region.scrollLeft -= edge - left;
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard-reachable (WCAG 2.1.1)
    <div className={`scroll-x ${className}`} tabIndex={0} role="region" aria-label={label} onFocus={onFocus}>
      {children}
    </div>
  );
}
