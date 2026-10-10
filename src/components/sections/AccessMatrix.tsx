// Portal × feature grid of state chips. Desktop: full table with a sticky first column;
// tablet: the table scrolls sideways inside its own container (intentional); mobile: one card per portal.
// The EU aggregator column is set apart (hatched header, dashed rule) and never treated as a national column.
import type { AccessCapability, FeatureId, Portal, SnapshotLayer } from "@/data/types";
import { ClassBadge, ComparabilityBadge, StateChip } from "@/components/ui/Badges";
import { SourceBadge } from "@/components/source/SourceBadge";
import { STATE_LABEL } from "@/content/copy";
import { StickyScrollRegion } from "@/components/ui/StickyScrollRegion";

export const ACCESS_FEATURES: FeatureId[] = ["api", "formats", "metadata_standard", "licensing", "hvd", "publishers", "metadata_activity"];

function Cell({ c, compact }: { c: AccessCapability; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1" data-cell={`${c.portalId}.${c.feature}`}>
      <div>
        <StateChip state={c.state} />
      </div>
      {c.display && c.display.trim().toLowerCase() !== (STATE_LABEL[c.state] ?? "").toLowerCase() ? (
        <p className={`text-[13px] leading-[18px] text-ink ${compact ? "" : ""}`}>{c.display}</p>
      ) : null}
      <div className="mt-0.5 flex flex-wrap items-center gap-1">
        {c.comparability ? <ComparabilityBadge status={c.comparability} reason={c.comparabilityReason || undefined} size="sm" /> : null}
        <SourceBadge
          layer={c.layer as SnapshotLayer | null}
          target={{ cell: { portalId: c.portalId, feature: c.feature } }}
          label={`View source for ${c.portalId.toUpperCase()} ${c.feature.replace(/_/g, " ")}${c.layer ? ` (layer ${c.layer})` : ""}`}
        />
      </div>
    </div>
  );
}

export function AccessMatrix({
  portals,
  features = ACCESS_FEATURES,
  cells,
  featureLabels,
  caption,
  compact = true,
}: {
  portals: Portal[];
  features?: FeatureId[];
  cells: AccessCapability[];
  featureLabels: Record<string, string>;
  caption: string;
  compact?: boolean;
}) {
  const cellOf = (p: Portal, f: FeatureId) => cells.find((c) => c.portalId === p.id && c.feature === f);
  const national = portals.filter((p) => p.portalClass === "national");
  const others = portals.filter((p) => p.portalClass !== "national");
  const cols = [...national, ...others];
  return (
    <>
      {/* ≥ 768 px: table (scrolls sideways on tablet) */}
      <div className="hidden md:block">
        {/* Intentional scroll container; keyboard users can scroll it. */}
        <StickyScrollRegion className="rounded-lg border border-rule scroll-pl-[124px] xl:scroll-pl-[154px]" label={`${caption} (scrollable)`}>
          {/* A minimum width only for the multi-portal grid; a single-portal matrix (country pages) fits any tablet. */}
          <table className={`access-matrix w-full border-collapse bg-surface text-left ${cols.length > 2 ? "min-w-[940px]" : ""}`}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 w-[120px] bg-surface p-2 text-xs font-semibold text-ink-muted xl:w-[150px] xl:p-3">
                  Feature
                </th>
                {cols.map((p) => (
                  <th
                    key={p.id}
                    scope="col"
                    className={`p-2 xl:p-3 align-bottom text-sm font-semibold ${p.id === "mk" ? "bg-accent-soft text-accent" : "text-ink"} ${
                      p.portalClass === "aggregator" ? "eu-hatch border-l-2 border-dashed border-eu" : ""
                    }`}
                  >
                    <span className="block">{p.country}</span>
                    <span className="block text-xs font-normal text-ink-muted">{p.domain}</span>
                    {p.portalClass !== "national" ? (
                      <span className="mt-1 block">
                        <ClassBadge portalClass={p.portalClass} />
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f} className="border-t border-rule align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-2 text-sm font-semibold text-ink shadow-[1px_0_0_var(--rule)] xl:p-3">
                    {featureLabels[f]}
                  </th>
                  {cols.map((p) => {
                    const c = cellOf(p, f);
                    return (
                      <td
                        key={p.id}
                        className={`p-2 xl:p-3 ${p.id === "mk" ? "mk-col" : ""} ${p.portalClass === "aggregator" ? "border-l-2 border-dashed border-eu bg-eu-tint" : ""}`}
                      >
                        {c ? <Cell c={c} compact={compact} /> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </StickyScrollRegion>
      </div>

      {/* < 768 px: one card per portal listing its features */}
      <div className="space-y-2 md:hidden">
        {cols.map((p) => (
          <details
            key={p.id}
            className={`card px-4 py-3 ${p.portalClass === "aggregator" ? "border-dashed !border-eu bg-eu-tint" : ""}`}
            open={p.id === "mk" || cols.length === 1}
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
              <span className={p.id === "mk" ? "text-accent" : ""}>{p.country}</span>
              <span className="text-xs font-normal text-ink-muted">{p.domain}</span>
              {p.portalClass !== "national" ? <ClassBadge portalClass={p.portalClass} /> : null}
            </summary>
            <dl className="mt-3 space-y-3">
              {features.map((f) => {
                const c = cellOf(p, f);
                return (
                  <div key={f}>
                    <dt className="text-sm font-semibold text-ink-muted">{featureLabels[f]}</dt>
                    <dd className="mt-1">{c ? <Cell c={c} /> : null}</dd>
                  </div>
                );
              })}
            </dl>
          </details>
        ))}
      </div>
    </>
  );
}
