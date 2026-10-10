"use client";
// Portals menu: ARIA menu-button pattern with three labelled groups.
// Enter, Space or ArrowDown opens it on the first item, ArrowUp on the last; arrows, Home and End move;
// Esc closes and returns focus to the button; Tab closes and lets focus continue.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { PortalNavGroup } from "./portalNav";

export function PortalMenu({ groups, active }: { groups: PortalNavGroup[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<"first" | "last" | null>(null);
  const menuId = useId();
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // close after navigation (state adjusted during render, not in an effect)
    setLastPath(pathname);
    setOpen(false);
  }

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
  const focusItem = useCallback((i: number) => {
    const list = Array.from(menu.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
    if (list.length === 0) return;
    const n = ((i % list.length) + list.length) % list.length;
    list[n]?.focus();
  }, []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (open && pendingFocus.current) {
      focusItem(pendingFocus.current === "first" ? 0 : -1);
      pendingFocus.current = null;
    }
  }, [open, focusItem]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pendingFocus.current = "first";
      if (open) focusItem(0);
      else setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pendingFocus.current = "last";
      if (open) focusItem(-1);
      else setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      case " ":
        // Space activates the focused link, as Enter does
        e.preventDefault();
        (document.activeElement as HTMLAnchorElement | null)?.click();
        break;
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        id={`${menuId}-button`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        className={`nav-link inline-flex items-center gap-1 ${active ? "nav-link-active" : ""}`}
      >
        Portals
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className={open ? "rotate-180" : ""} />
      </button>
      <div
        ref={menu}
        id={menuId}
        role="menu"
        tabIndex={-1}
        aria-labelledby={`${menuId}-button`}
        hidden={!open}
        onKeyDown={onMenuKey}
        className="absolute top-full right-0 z-50 mt-2 w-[22rem] rounded-lg border border-rule bg-surface p-2 shadow-[0_8px_24px_rgba(24,32,42,0.12)]"
      >
        {groups.map((g, gi) => (
          <div key={g.key} className={gi > 0 ? "mt-1 border-t border-rule pt-1" : ""}>
            <div aria-hidden="true" className="px-2 pt-1.5 pb-1 text-xs leading-4 font-semibold text-ink-muted">
              {g.label}
            </div>
            <div role="group" aria-label={g.label}>
              {g.items.map((p) => {
                const current = pathname === p.href;
                return (
                  <Link
                    key={p.id}
                    href={p.href}
                    role="menuitem"
                    tabIndex={-1}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-baseline justify-between gap-3 rounded px-2 py-1.5 text-sm no-underline hover:bg-accent-soft focus-visible:bg-accent-soft ${
                      current ? "bg-accent-soft font-semibold text-accent" : "text-ink"
                    } ${p.id === "mk" ? "font-semibold" : ""}`}
                  >
                    <span>{p.country}</span>
                    <span className="text-xs text-ink-muted">{p.domain}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
