"use client";
// Below 1024 px the navigation moves into a full-height sheet. Native modal <dialog>:
// focus is trapped, Esc closes, focus returns to the menu button.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/content/copy";
import type { PortalNavGroup } from "./portalNav";
import { navKeyFor } from "./NavLinks";

export function MobileMenu({ groups }: { groups: PortalNavGroup[] }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const current = navKeyFor(pathname);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // close after navigation (state adjusted during render, not in an effect)
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) {
      d.close();
      trigger.current?.focus();
    }
  }, [open]);

  // Backdrop click closes the sheet; the keyboard equivalent is Esc (native cancel event).
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === d) setOpen(false);
    };
    d.addEventListener("click", onBackdrop);
    return () => d.removeEventListener("click", onBackdrop);
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-surface px-2 py-1.5 text-sm font-medium text-ink sm:px-2.5"
      >
        <Menu aria-hidden="true" size={18} strokeWidth={2} />
        <span className="sr-only sm:not-sr-only">Menu</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="mobile-menu-title"
        className="sheet fixed inset-0 m-0 ml-auto h-full max-h-none w-full max-w-[420px] overflow-y-auto border-l border-rule bg-surface p-0 text-ink"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <h2 id="mobile-menu-title" className="font-sans text-base leading-6">
            Menu
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-muted hover:text-accent"
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
            Close
          </button>
        </div>
        <nav aria-label="Primary (menu)" className="px-4 py-3">
          <ul className="space-y-1">
            {NAV.filter((n) => n.href !== null).map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href!}
                  aria-current={current === item.key ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block rounded px-2 py-2 text-base no-underline ${
                    current === item.key ? "bg-accent-soft font-semibold text-accent" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 px-2 text-sm leading-5 text-ink-muted">Portals</h3>
          {groups.map((g) => (
            <div key={g.key} className="mt-3">
              <h4 id={`mm-${g.key}`} className="px-2 text-xs leading-4 font-semibold text-ink-muted">
                {g.label}
              </h4>
              <ul aria-labelledby={`mm-${g.key}`} className="mt-1">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.href}
                      aria-current={pathname === p.href ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex items-baseline justify-between gap-3 rounded px-2 py-2 text-sm no-underline ${
                        pathname === p.href ? "bg-accent-soft font-semibold text-accent" : "text-ink"
                      } ${p.id === "mk" ? "font-semibold" : ""}`}
                    >
                      <span>{p.country}</span>
                      <span className="text-xs text-ink-muted">{p.domain}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </dialog>
    </>
  );
}
