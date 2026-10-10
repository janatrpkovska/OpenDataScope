"use client";
// One global source drawer. Any "View source" control calls useSource().open(target).
// The open record is mirrored in the URL as ?source=… (router-free history.replaceState), so a link
// can point at a specific piece of evidence; section anchors (#…) keep working.
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { SourceTarget } from "@/data/types";
import { SourceDrawer } from "./SourceDrawer";

export function targetToParam(t: SourceTarget): string {
  if ("metricId" in t) return t.metricId;
  if ("derivedId" in t) return `derived.${t.derivedId}`;
  if ("sourceId" in t) return `src:${t.sourceId}`;
  if ("readingId" in t) return `reading:${t.readingId}`;
  if ("statement" in t) return `stmt:${t.statement}`;
  return `cell:${t.cell.portalId}.${t.cell.feature}`;
}

export function paramToTarget(p: string): SourceTarget | null {
  if (!p) return null;
  if (p.startsWith("derived.")) return { derivedId: p.slice("derived.".length) };
  if (p.startsWith("src:")) return { sourceId: p.slice(4) };
  if (p.startsWith("reading:")) return { readingId: p.slice(8) };
  if (p.startsWith("stmt:")) return { statement: p.slice(5) };
  if (p.startsWith("cell:")) {
    const [portalId, feature] = p.slice(5).split(".");
    if (!portalId || !feature) return null;
    return { cell: { portalId: portalId as never, feature: feature as never } };
  }
  return /^[a-z]{2}\.[a-z0-9_]+$/.test(p) ? { metricId: p } : null;
}

interface Ctx {
  open: (t: SourceTarget) => void;
}
const SourceContext = createContext<Ctx | null>(null);

export function useSource(): Ctx {
  const c = useContext(SourceContext);
  if (!c) throw new Error("useSource must be used inside <SourceProvider>");
  return c;
}

function writeParam(value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("source", value);
  else url.searchParams.delete("source");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

function UrlSync({ onTarget }: { onTarget: (t: SourceTarget) => void }) {
  const params = useSearchParams();
  const initial = useRef(true);
  useEffect(() => {
    if (!initial.current) return;
    initial.current = false;
    const t = paramToTarget(params.get("source") ?? "");
    if (t) onTarget(t);
  }, [params, onTarget]);
  return null;
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SourceTarget[]>([]);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((t: SourceTarget) => {
    setStack((s) => {
      if (s.length === 0) returnFocus.current = (document.activeElement as HTMLElement) ?? null;
      return s.length === 0 ? [t] : [...s, t];
    });
    writeParam(targetToParam(t));
  }, []);
  const openFromUrl = useCallback((t: SourceTarget) => {
    setStack([t]);
  }, []);
  const back = useCallback(() => {
    setStack((s) => {
      const next = s.slice(0, -1);
      const top = next[next.length - 1];
      writeParam(top ? targetToParam(top) : null);
      return next;
    });
  }, []);
  const close = useCallback(() => {
    setStack([]);
    writeParam(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el && document.contains(el)) setTimeout(() => el.focus(), 0);
  }, []);

  const value = useMemo(() => ({ open }), [open]);
  const current = stack[stack.length - 1] ?? null;
  return (
    <SourceContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <UrlSync onTarget={openFromUrl} />
      </Suspense>
      <SourceDrawer target={current} canGoBack={stack.length > 1} onBack={back} onClose={close} onOpen={open} />
    </SourceContext.Provider>
  );
}
