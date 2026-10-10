// MethodologyNote and EmptyState.
import Link from "next/link";
import type { Cta, SourceTarget } from "@/data/types";
import { ViewSource } from "@/components/source/SourceBadge";

export function MethodologyNote({ children, href, linkLabel = "Explained in methodology" }: { children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div role="note" className="mt-4 rounded-lg border border-rule bg-bg px-4 py-3 text-sm leading-6 text-ink">
      {children}
      {href ? (
        <>
          {" "}
          <Link href={href} className="whitespace-nowrap">
            {linkLabel}
          </Link>
        </>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body, action, source }: { title: string; body: string; action?: Cta; source?: SourceTarget }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-muted bg-surface px-5 py-6 text-center" role="status" data-empty-state>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{body}</p>
      <div className="mt-3 flex justify-center gap-4">
        {action ? <Link href={action.href}>{action.label}</Link> : null}
        {source ? <ViewSource target={source} /> : null}
      </div>
    </div>
  );
}
