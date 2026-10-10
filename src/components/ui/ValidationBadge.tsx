// "Later validation reading: 59,495 (+4, +0.007 %) on 9 Oct 2026".
// Canonical values keep the main position; a later reading only ever appears here, in a tooltip or in the drawer.
import type { ValidationReading } from "@/data/types";
import { NBSP, fmtDayShort, fmtReadingValue, fmtSigned } from "@/data/format";
import { ViewSource } from "@/components/source/SourceBadge";

export function readingDay(r: ValidationReading): string | null {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(r.readingTime);
  return m ? fmtDayShort(m[1]!) : null;
}

/** The plain-text form, also used in chart tooltips and table cells. */
export function validationSentence(r: ValidationReading): string {
  const label = r.layer === "V" ? "Later validation reading" : "Earlier reading (superseded)";
  const value = fmtReadingValue(r.visibleValue, r.visibleNumber);
  const day = readingDay(r);
  if (r.visibleValue.startsWith("HTTP 504")) return `${label}: ${r.visibleValue}. Timeout, not missing data${day ? ` (${day})` : ""}`;
  let drift = "";
  if (r.visibleNumber !== null && r.difference !== null) {
    drift =
      r.difference === 0
        ? " (no difference)"
        : ` (${fmtSigned(r.difference)}${r.differencePct !== null ? `, ${fmtSigned(r.differencePct, 3)}${NBSP}%` : ""})`;
  }
  return `${label}: ${value} ${r.metric}${drift}${day ? ` on ${day}` : ""}`;
}

export function ValidationBadge({ reading }: { reading: ValidationReading }) {
  return (
    <p className="text-sm leading-6 text-ink-muted" data-validation={reading.id}>
      <span>{validationSentence(reading)}</span>
      {reading.note ? <span className="block text-xs leading-5">{reading.note}</span> : null}{" "}
      <ViewSource target={{ readingId: reading.id }} className="text-xs">
        Reading record
      </ViewSource>
    </p>
  );
}
