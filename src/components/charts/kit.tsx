"use client";
// Shared chart plumbing:
// - palette by colour key, with hatch patterns for the EU aggregator and "no format given";
// - container width via ResizeObserver (charts render at the measured width; nothing on the server);
// - mobile switch at 768 px;
// - an HTML tooltip that Recharts' keyboard accessibility layer drives (← → move, Enter toggles), and
//   "Enter opens the source" for the focused value; a click on a mark opens the same record.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import type { SourceTarget } from "@/data/types";
import { useSource } from "@/components/source/SourceProvider";

export const FILL: Record<string, string> = {
  mk: "var(--portal-mk)",
  local: "var(--portal-mk)",
  central: "var(--fmt-not-mr)",
  national: "var(--portal-national)",
  rs: "var(--portal-rs)",
  eu: "var(--portal-eu)",
  mid: "var(--fmt-not-mr)",
  light: "var(--light-segment)",
  "fmt-open": "var(--fmt-open)",
  "fmt-proprietary": "var(--fmt-proprietary)",
  "fmt-not-mr": "var(--fmt-not-mr)",
  "fmt-none": "var(--fmt-none)",
};

/** Keys drawn with a pattern (colour is never the only signal): EU hatched, no-format hatched. */
export function fillFor(colorKey: string, ids: { eu: string; none: string }): string {
  if (colorKey === "eu") return `url(#${ids.eu})`;
  if (colorKey === "fmt-none") return `url(#${ids.none})`;
  return FILL[colorKey] ?? "var(--portal-national)";
}

export function strokeFor(colorKey: string, outlined?: boolean): { stroke?: string; strokeDasharray?: string; strokeWidth?: number } {
  if (colorKey === "rs") return { stroke: "var(--ink-muted)", strokeDasharray: "4 3", strokeWidth: 1.5 };
  if (outlined || colorKey === "light") return { stroke: "var(--ink-muted)", strokeWidth: 1 };
  if (colorKey === "eu") return { stroke: "var(--portal-eu)", strokeWidth: 1 };
  if (colorKey === "fmt-none") return { stroke: "var(--fmt-none)", strokeWidth: 1 };
  return {};
}

export function Patterns({ ids }: { ids: { eu: string; none: string } }) {
  return (
    <defs>
      <pattern id={ids.eu} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="var(--portal-eu)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" />
      </pattern>
      <pattern id={ids.none} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#ffffff" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--fmt-none)" strokeWidth="2.5" />
      </pattern>
    </defs>
  );
}

/** A swatch for HTML legends, matching the SVG marks. */
export function Swatch({ colorKey, outlined }: { colorKey: string; outlined?: boolean }) {
  const base = "inline-block size-3 shrink-0 rounded-[2px] align-middle";
  if (colorKey === "eu") return <span aria-hidden="true" className={`${base} eu-swatch`} />;
  if (colorKey === "fmt-none") return <span aria-hidden="true" className={`${base} none-swatch`} />;
  if (colorKey === "rs") return <span aria-hidden="true" className={`${base} border-[1.5px] border-dashed border-ink-muted`} style={{ background: FILL.rs }} />;
  return (
    <span
      aria-hidden="true"
      className={`${base} ${outlined || colorKey === "light" ? "border border-ink-muted" : ""}`}
      style={{ background: FILL[colorKey] ?? FILL.national }}
    />
  );
}

export function Legend({ items }: { items: { key: string; label: string; colorKey: string; outlined?: boolean }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-ink" aria-label="Legend">
      {items.map((i) => (
        <li key={i.key} className="inline-flex items-center gap-1.5">
          <Swatch colorKey={i.colorKey} outlined={i.outlined} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0]?.contentRect.width ?? 0);
      setW((prev) => (prev === cw ? prev : cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const MQ = "(max-width: 767px)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MQ).matches,
    () => false,
  );
}

/** Round axis ticks (0, step, 2·step …) with about four intervals; the domain ends at the last tick ≥ max. */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export const KEY_HINT = "Use the arrow keys to move between values; press Enter to open the source of the selected value.";

/**
 * Wraps a Recharts chart: remembers the row the tooltip shows, opens its source on Enter, and
 * gives the SVG an accessible name and description.
 */
export function useChartSource<R>(getTarget: (row: R) => SourceTarget) {
  const { open } = useSource();
  const active = useRef<R | null>(null);
  const setActive = useCallback((r: R | null) => {
    active.current = r;
  }, []);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && active.current) {
        e.preventDefault();
        open(getTarget(active.current));
      }
    },
    [open, getTarget],
  );
  const openRow = useCallback((r: R) => open(getTarget(r)), [open, getTarget]);
  return { setActive, onKeyDown, openRow };
}

/** Tooltip body: fields as a definition list, plus the source hint. Reports the shown row to the chart. */
export function TooltipBox<R>({
  active,
  row,
  title,
  fields,
  onActive,
}: {
  active: boolean;
  row: R | null;
  title: ReactNode;
  fields: { label: string; value: ReactNode; lang?: string }[];
  onActive: (r: R | null) => void;
}) {
  useEffect(() => {
    onActive(active ? row : null);
  }, [active, row, onActive]);
  if (!active || !row) return null;
  return (
    <div className="max-w-[min(20rem,calc(100vw-3rem))] rounded-lg border border-rule bg-surface p-3 text-xs leading-5 text-ink shadow-[0_8px_24px_rgba(23,32,51,0.12)]" role="status" aria-live="polite">
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3">
        {fields.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-ink-muted">{f.label}</dt>
            <dd lang={f.lang}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 border-t border-rule pt-1.5 text-ink-muted">View source: press Enter or click the mark.</p>
    </div>
  );
}

/**
 * All charts here are horizontal bars (Recharts layout="vertical"), where Recharts' keyboard layer treats
 * ArrowLeft as "next". Readers expect ↓ and → to move down the list and ↑ and ← to move up, so trusted
 * arrow presses are re-dispatched as the key Recharts expects (the re-dispatched event is untrusted and
 * passes through unchanged).
 */
function remapArrows(e: KeyboardEvent<HTMLDivElement>) {
  if (!e.nativeEvent.isTrusted) return;
  const next = e.key === "ArrowDown" || e.key === "ArrowRight";
  const prev = e.key === "ArrowUp" || e.key === "ArrowLeft";
  if (!next && !prev) return;
  e.preventDefault();
  e.stopPropagation();
  e.target.dispatchEvent(new window.KeyboardEvent("keydown", { key: next ? "ArrowLeft" : "ArrowRight", bubbles: true, cancelable: true }));
}

/** Chart surface wrapper: measured width, keyboard source shortcut, hint for keyboard users. */
export function ChartFrame({
  height,
  children,
  onKeyDown,
  widthRef,
}: {
  height: number;
  children: ReactNode;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  widthRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    // The Recharts surface inside is the focusable element (role="application", tabIndex 0); this wrapper
    // only listens for Enter bubbling from it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={widthRef} className="chart-surface relative w-full min-w-0" style={{ height }} onKeyDown={onKeyDown} onKeyDownCapture={remapArrows}>
      {children}
    </div>
  );
}
