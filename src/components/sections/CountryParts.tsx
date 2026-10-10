// Portal-page pieces: ContextBanner, PortalCard, TextSection, SourceList.
import Link from "next/link";
import type { AccessCapability, Portal, ResolvedMetric, SnapshotLayer, SourceRecord } from "@/data/types";
import { portalHref } from "@/components/shell/portalNav";
import { ClassBadge, ComparabilityBadge, StateChip } from "@/components/ui/Badges";
import { SourceBadge, ViewSource } from "@/components/source/SourceBadge";
import { SourceLinkView } from "@/components/source/SourceDrawer";
import { LAYER_LABEL, SOURCE_TYPE_LABEL } from "@/content/copy";

export function ContextBanner({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-lg border-2 border-dashed border-ink-muted bg-surface px-4 py-3 text-[15px] font-medium" role="note" data-context-banner>
      <span aria-hidden="true" className="mr-2 font-semibold text-ink-muted">
        i
      </span>
      {text}
    </div>
  );
}

export function PortalCard({ portal, headline }: { portal: Portal; headline: ResolvedMetric }) {
  return (
    <div
      className={`card relative p-4 hover:border-accent ${portal.portalClass === "aggregator" ? "border-dashed !border-eu" : portal.portalClass === "regional_context" ? "border-dashed" : ""}`}
      data-portal-card={portal.id}
    >
      <Link href={portalHref(portal)} className={`block font-semibold ${portal.id === "mk" ? "text-accent" : "text-ink"}`}>
        {portal.country}
      </Link>
      <span className="block text-xs text-ink-muted">{portal.domain}</span>
      <span className="mt-2 block">
        <ClassBadge portalClass={portal.portalClass} />
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
        {headline.display} {portal.unitLabel}
        <SourceBadge layer={headline.snapshotId as SnapshotLayer} target={{ metricId: headline.id }} label={`View source for ${portal.country} catalogue size`} />
      </span>
    </div>
  );
}

/** A heading with the access-matrix text for one feature, its state, badge and evidence. */
export function TextSection({ id, title, cell, children }: { id: string; title: string; cell: AccessCapability; children?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="section">
      <h2 id={id} className="scroll-mt-2">
        {title}
      </h2>
      <div className="card mt-4 p-5" data-text-section={cell.feature}>
        <div className="flex flex-wrap items-center gap-2">
          <StateChip state={cell.state} />
          {cell.comparability ? <ComparabilityBadge status={cell.comparability} reason={cell.comparabilityReason || undefined} /> : null}
          <SourceBadge layer={cell.layer as SnapshotLayer | null} target={{ cell: { portalId: cell.portalId, feature: cell.feature } }} />
        </div>
        <p className="mt-3 text-[16px] leading-7">{cell.display}</p>
        {cell.comparabilityReason ? <p className="mt-1 text-sm leading-6 text-ink-muted">{cell.comparabilityReason}</p> : null}
        {cell.note ? <p className="mt-1 text-sm leading-6 text-ink-muted">{cell.note}</p> : null}
        <p className="mt-2">
          <ViewSource target={{ cell: { portalId: cell.portalId, feature: cell.feature } }} />
        </p>
        {children}
      </div>
    </section>
  );
}

export function SourceList({ sources }: { sources: SourceRecord[] }) {
  return (
    <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
      {sources.map((s) => (
        <li key={s.id} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center" data-source={s.id}>
          <div>
            <p className="font-medium text-ink">{s.title}</p>
            <p className="text-sm text-ink-muted">
              {s.issuer} · {SOURCE_TYPE_LABEL[s.sourceType]} · {LAYER_LABEL[s.layer]} · {s.usedFor}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <SourceLinkView source={s} label={s.sourceType === "api_snapshot" || s.sourceType === "page_reading" ? "Open official source" : "Open source"} />
            <ViewSource target={{ sourceId: s.id }} className="text-sm">
              Source record
            </ViewSource>
          </div>
        </li>
      ))}
    </ul>
  );
}
