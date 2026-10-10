// Country pages only: Portals › {class} › {portal}.
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="inline-flex items-center gap-1">
              {it.href && !last ? <Link href={it.href}>{it.label}</Link> : <span aria-current={last ? "page" : undefined}>{it.label}</span>}
              {!last ? <ChevronRight aria-hidden="true" size={14} strokeWidth={2} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
