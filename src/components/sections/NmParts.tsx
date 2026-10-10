// Pieces of the North Macedonia page: OpportunityList and InlineComparison.
import Link from "next/link";
import type { ComparabilityStatus, RenderedOpportunity } from "@/data/types";
import { ComparabilityBadge } from "@/components/ui/Badges";
import { ViewSource } from "@/components/source/SourceBadge";

export function OpportunityList({ items, sectionLabels }: { items: RenderedOpportunity[]; sectionLabels: Record<string, string> }) {
  return (
    <ol className="space-y-3">
      {items.map((o) => (
        <li key={o.id} className="card grid gap-x-4 gap-y-1 p-4 sm:grid-cols-[2.5rem_1fr] lg:p-5" data-opportunity={o.id}>
          <span aria-hidden="true" className="font-serif text-2xl leading-8 font-semibold text-accent">
            {o.n}
          </span>
          <div>
            <h3 className="text-lg leading-7">{o.title}</h3>
            <p className="mt-1 text-[15px] leading-6 text-ink">
              <span className="font-medium text-ink-muted">Evidence: </span>
              {o.text}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <ViewSource target={{ statement: `opportunities.${o.id}` }} className="text-sm">
                View evidence
              </ViewSource>
              <Link href={o.href}>See {sectionLabels[o.href.replace(/^.*#/, "")] ?? `section ${o.section}`}</Link>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function InlineComparison({ text, status, statement }: { text: string; status: ComparabilityStatus; statement: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px] leading-6" data-inline-comparison>
      <ComparabilityBadge status={status} reason="Same dataset-level measure in both portals." />
      <span>{text}</span>
      <ViewSource target={{ statement }} className="text-xs">
        View evidence
      </ViewSource>
    </p>
  );
}
