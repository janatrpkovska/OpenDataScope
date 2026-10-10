// Comparability badge, state chip, missing value and project-indicator label.
// Badges always show their word plus a glyph: colour is never the only signal.
import type { CapabilityState, ComparabilityStatus, MissingReason, RuleId } from "@/data/types";
import { COMPARABILITY, MISSING, RULES, STATE_LABEL } from "@/content/copy";
import { InfoTooltip } from "./InfoTooltip";
import { LangText } from "./LangText";

const STATUS_STYLE: Record<ComparabilityStatus, string> = {
  direct: "border-direct text-direct",
  partial: "border-partial text-partial",
  context_only: "border-context border-dashed text-context",
};

export function ComparabilityBadge({
  status,
  reason,
  withTooltip = true,
  size = "md",
}: {
  status: ComparabilityStatus;
  reason?: string;
  withTooltip?: boolean;
  size?: "sm" | "md";
}) {
  const c = COMPARABILITY[status];
  const chip = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-surface font-medium whitespace-nowrap ${STATUS_STYLE[status]} ${size === "sm" ? "px-1.5 py-0 text-[11px] leading-4" : "px-2 py-0.5 text-xs leading-4"}`}
      data-comparability={status}
    >
      <span aria-hidden="true" className="font-semibold">
        {c.glyph}
      </span>
      {c.word}
    </span>
  );
  if (!withTooltip) return chip;
  return (
    <InfoTooltip label={`${c.long}`} trigger={chip}>
      <span className="block">{c.meaning}</span>
      {reason ? <span className="mt-1 block text-ink-muted">{reason}</span> : null}
    </InfoTooltip>
  );
}

/** A missing value: always words, never 0, a dash or an empty cell. */
export function MissingValue({ reason, withTooltip = false }: { reason: MissingReason; withTooltip?: boolean }) {
  const m = MISSING[reason];
  const label = <span className="missing-value" data-missing={reason}>{m.label}</span>;
  if (!withTooltip) return label;
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <InfoTooltip label={m.label}>{m.meaning}</InfoTooltip>
    </span>
  );
}

const STATE_STYLE: Record<string, string> = {
  available: "border-direct bg-surface text-ink",
  limited: "border-partial bg-surface text-ink",
};

export function StateChip({ state }: { state: CapabilityState }) {
  if (state !== "available" && state !== "limited") {
    return <MissingValue reason={state} />;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0 text-[11px] leading-5 font-medium ${STATE_STYLE[state]}`} data-state={state}>
      {STATE_LABEL[state]}
    </span>
  );
}

export function ProjectIndicatorLabel({ rule }: { rule: RuleId }) {
  return (
    <InfoTooltip
      label="Project-defined indicator"
      trigger={
        <span className="inline-flex items-center rounded-full border border-accent px-2 py-0.5 text-xs leading-4 font-medium text-accent" data-project-indicator={rule}>
          Project-defined indicator
        </span>
      }
    >
      <span className="block">
        <LangText text={RULES[rule]} />
      </span>
      <span className="mt-1 block text-ink-muted">A project rule, not an official rating or quality score.</span>
    </InfoTooltip>
  );
}

export function ClassBadge({ portalClass }: { portalClass: "national" | "aggregator" | "regional_context" }) {
  const style =
    portalClass === "aggregator"
      ? "border-eu text-eu eu-hatch"
      : portalClass === "regional_context"
        ? "border-dashed border-ink-muted text-ink-muted"
        : "border-rule text-ink";
  const label = portalClass === "aggregator" ? "EU aggregator" : portalClass === "regional_context" ? "Regional context" : "National portal";
  return <span className={`inline-flex items-center rounded-full border bg-surface px-2 py-0.5 text-xs leading-4 font-medium ${style}`}>{label}</span>;
}
