// One number with label, caption, layer chip and "View source".
// A missing value renders its reason in words, never 0. A verified zero prints "0" with its evidence.
import type { ResolvedMetric, SnapshotLayer } from "@/data/types";
import { fmtShare, fmtInt, unitText } from "@/data/format";
import { MissingValue } from "./Badges";
import { InfoTooltip } from "./InfoTooltip";
import { ValidationBadge } from "./ValidationBadge";
import { SourceBadge, ViewSource } from "@/components/source/SourceBadge";

export interface MetricCardProps {
  metric: ResolvedMetric;
  label: string;
  caption?: string;
  tooltip?: string;
  /** Show the value as a share of another metric, e.g. datasets with a theme of all datasets. */
  asShareOf?: ResolvedMetric;
  emphasis?: boolean;
  /** Evidence line printed with a genuine zero. */
  zeroEvidence?: string;
  /** Replace the formatted number with generated text (e.g. "CKAN 2.10.9"). */
  valueText?: string;
  showUnit?: boolean;
  showValidation?: boolean;
  /** A derived value behind the caption: adds "How is this calculated?". */
  derivedId?: string;
  /** Statement record behind a generated caption or tooltip (e.g. "text.groupsCaption"). */
  captionEvidence?: string;
  tooltipEvidence?: string;
}

export function MetricCard({
  metric,
  label,
  caption,
  tooltip,
  asShareOf,
  emphasis,
  zeroEvidence,
  valueText,
  showUnit,
  showValidation,
  derivedId,
  captionEvidence,
  tooltipEvidence,
}: MetricCardProps) {
  const missing = metric.value === null;
  const isZero = metric.value === 0;
  const shareBase = asShareOf && typeof asShareOf.value === "number" ? asShareOf.value : null;
  const big =
    valueText ??
    (shareBase !== null && typeof metric.value === "number" ? fmtShare(metric.value, shareBase) : metric.display);
  const unit = showUnit && typeof metric.value === "number" ? unitText(metric.unit, metric.value) : "";
  return (
    <div className="card metric-card flex h-full flex-col p-4 lg:p-5" data-metric={metric.id}>
      <div className="mc-head flex items-start justify-between gap-2">
        <p className="text-sm leading-5 font-medium text-ink-muted">
          {label}
          {tooltip ? (
            <span className="ml-1 align-middle">
              <InfoTooltip label={label}>
                {tooltip}
                {tooltipEvidence ? (
                  <span className="mt-1 block">
                    <ViewSource target={{ statement: tooltipEvidence }} className="text-xs">
                      View evidence
                    </ViewSource>
                  </span>
                ) : null}
              </InfoTooltip>
            </span>
          ) : null}
        </p>
        <SourceBadge layer={metric.snapshotId as SnapshotLayer} target={{ metricId: metric.id }} label={`View source for ${label} (layer ${metric.snapshotId})`} />
      </div>
      <p className={`metric-number mt-1 ${emphasis ? "text-accent" : "text-ink"}`} data-value={missing ? "missing" : String(metric.value)}>
        {missing ? (
          <span className="text-xl leading-8 font-normal">
            <MissingValue reason={metric.missingReason ?? "not_reliably_available"} withTooltip />
          </span>
        ) : (
          <>
            {big}
            {unit ? <span className="ml-1.5 text-base font-medium text-ink-muted">{unit}</span> : null}
          </>
        )}
      </p>
      {shareBase !== null && typeof metric.value === "number" ? (
        <p className="text-sm leading-5 text-ink-muted">
          {fmtInt(metric.value)} of {fmtInt(shareBase)} {unitText(asShareOf!.unit, shareBase)}
        </p>
      ) : null}
      {isZero && zeroEvidence ? (
        <p className="mt-1 text-sm leading-5 text-ink" data-zero-evidence>
          {zeroEvidence}
        </p>
      ) : null}
      {caption ? (
        <p className="mt-1 text-sm leading-5 text-ink-muted" data-caption>
          {caption}
          {captionEvidence ? (
            <>
              {" "}
              <ViewSource target={{ statement: captionEvidence }} className="text-xs whitespace-nowrap">
                View evidence
              </ViewSource>
            </>
          ) : null}
        </p>
      ) : null}
      {derivedId ? (
        <p className="mt-1">
          <ViewSource target={{ derivedId }} className="text-xs">
            How is this calculated?
          </ViewSource>
        </p>
      ) : null}
      {showValidation && metric.validation.length ? (
        <div className="mt-2 space-y-1">
          {metric.validation.map((r) => (
            <ValidationBadge key={r.id} reading={r} />
          ))}
        </div>
      ) : null}
      <div className="mc-foot mt-auto pt-3">
        <ViewSource target={{ metricId: metric.id }} describedBy={undefined}>
          View source
        </ViewSource>
      </div>
    </div>
  );
}

export function PortalMetricGrid({ items, columns = 3, facts = false }: { items: MetricCardProps[]; columns?: 2 | 3 | 5; facts?: boolean }) {
  const cols =
    columns === 5
      ? "md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-5"
      : columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 gap-3 lg:gap-4 ${cols} ${facts ? "facts-grid" : ""}`}>
      {items.map((it) => (
        <MetricCard key={it.metric.id + it.label} {...it} />
      ))}
    </div>
  );
}
