"use client";
// In-page section list: a sticky side list at 1280 px and wider, a sideways-scrolling chip row
// below that. The section in view is marked aria-current.
import { useEffect, useState } from "react";

export function SectionNav({ items, label = "On this page" }: { items: { id: string; label: string }[]; label?: string }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Number.POSITIVE_INFINITY);
        const top = [...visible.entries()].filter(([, t]) => Number.isFinite(t)).sort((a, b) => a[1] - b[1])[0];
        if (top) setActive(top[0]);
      },
      { rootMargin: "-90px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="section-nav min-w-0 xl:sticky xl:top-24 xl:self-start">
      <p className="mb-2 hidden text-xs font-semibold tracking-wide text-ink-muted uppercase xl:block">{label}</p>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 xl:mx-0 xl:flex-col xl:gap-0.5 xl:overflow-visible xl:px-0 xl:pb-0">
        {items.map((i) => {
          const current = active === i.id;
          return (
            <li key={i.id} className="shrink-0">
              <a
                href={`#${i.id}`}
                aria-current={current ? "location" : undefined}
                className={`block rounded-full border px-3 py-1 text-sm whitespace-nowrap no-underline xl:rounded-md xl:border-0 xl:border-l-2 xl:px-3 xl:py-1.5 xl:whitespace-normal ${
                  current ? "border-accent bg-accent-soft font-semibold text-accent" : "border-rule bg-surface text-ink hover:text-accent xl:border-transparent xl:bg-transparent"
                }`}
              >
                {i.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
