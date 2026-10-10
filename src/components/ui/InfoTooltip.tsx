"use client";
// Button-triggered popover that also opens on hover and focus: never hover-only.
// Enter/Space/click toggle it, Esc closes it and keeps focus on the button, an outside click closes it.
import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function InfoTooltip({
  label,
  children,
  trigger,
  className = "",
}: {
  label: string;
  children: ReactNode;
  trigger?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const openedAt = useRef(0);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (button.current) {
      const r = button.current.getBoundingClientRect();
      setAlignRight(r.left > window.innerWidth / 2);
    }
    setOpen((o) => {
      if (!o) openedAt.current = Date.now();
      return true;
    });
  }, []);
  const hideSoon = () => {
    hoverTimer.current = setTimeout(() => setOpen(false), 180);
  };

  // The popover is position: fixed and placed from the button's rectangle, so it is never clipped by a table's
  // scroll box: below the button, flipped above it when there is no room, and kept inside the
  // viewport with an 8 px margin. It follows the button while the page or a scroll box scrolls. A cell that
  // holds an open tooltip is raised above the sticky row headers by CSS (globals.css, :has). Written to the DOM
  // directly, no re-render.
  useLayoutEffect(() => {
    const el = pop.current;
    const btn = button.current;
    if (!open || !el || !btn) return;
    let frame = 0;
    const place = () => {
      const b = btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let left = alignRight ? b.right - w : b.left;
      left = Math.max(8, Math.min(left, vw - 8 - w));
      let top = b.bottom + 8;
      if (top + h > vh - 8 && b.top - 8 - h >= 8) top = b.top - 8 - h;
      el.style.left = `${Math.round(left)}px`;
      el.style.top = `${Math.round(top)}px`;
      // correct for any containing block other than the viewport (e.g. a transformed ancestor)
      const r = el.getBoundingClientRect();
      if (Math.abs(r.left - left) > 0.5 || Math.abs(r.top - top) > 0.5) {
        el.style.left = `${Math.round(2 * left - r.left)}px`;
        el.style.top = `${Math.round(2 * top - r.top)}px`;
      }
    };
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, alignRight]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // only reclaim focus when it is inside this tooltip; never steal it from elsewhere
        const inside = !!wrap.current && wrap.current.contains(document.activeElement);
        setOpen(false);
        if (inside) button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrap}
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onBlur={(e) => {
        // close once keyboard focus leaves the button and its popover
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={trigger ? undefined : label}
        className="inline-flex min-h-6 items-center gap-1 rounded-sm text-ink-muted hover:text-accent"
        onFocus={show}
        onClick={() => {
          // a click right after focus/hover opened it keeps it open; otherwise it toggles
          if (open && Date.now() - openedAt.current > 300) setOpen(false);
          else show();
        }}
      >
        {trigger ?? <Info aria-hidden="true" size={16} strokeWidth={2} />}
      </button>
      <span
        ref={pop}
        id={id}
        role="note"
        hidden={!open}
        className="fixed top-0 left-0 z-40 w-[min(20rem,calc(100vw-2rem))] transition-none rounded-lg border border-rule bg-surface p-3 text-left text-sm leading-5 font-normal text-ink shadow-[0_8px_24px_rgba(24,32,42,0.12)]"
      >
        <span className="mb-1 block font-semibold">{label}</span>
        {children}
      </span>
    </span>
  );
}
