// Number formatting rules.
// - thousands separators: 1,605
// - shares computed from counts, shown to 1 decimal ("33.6 %"); 2 decimals only for the two
//   project-defined indicators and for printed "n / N = share" fractions
// - a non-breaking space separates a number from "%"

export const NBSP = " ";
export const PCT = `${NBSP}%`;

/** Round half away from zero at `decimals`, robust to binary representation (e.g. 54.6875 → 54.7). */
export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  const scaled = Math.abs(value) * f;
  const r = Math.round(scaled + 1e-9 * Math.max(1, scaled)) / f;
  return Math.sign(value) * r;
}

export function fixed(value: number, decimals: number): string {
  return round(value, decimals).toFixed(decimals);
}

/** Integer with thousands separators. */
export function fmtInt(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`fmtInt: not a finite number: ${value}`);
  return round(value, 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Decimal with thousands separators and a fixed number of decimals. */
export function fmtDec(value: number, decimals: number): string {
  return round(value, decimals).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(value: number, decimals: 1 | 2 = 1): string {
  return `${fmtDec(value, decimals)}${PCT}`;
}

export function share(numerator: number, denominator: number): number {
  if (!(denominator > 0)) throw new Error(`share: denominator must be > 0 (got ${denominator})`);
  return (numerator / denominator) * 100;
}

export function fmtShare(numerator: number, denominator: number, decimals: 1 | 2 = 1): string {
  return fmtPct(share(numerator, denominator), decimals);
}

/** "16,982 / 20,791 = 81.68 %" */
export function fmtFraction(numerator: number, denominator: number): string {
  return `${fmtInt(numerator)} / ${fmtInt(denominator)} = ${fmtShare(numerator, denominator, 2)}`;
}

/** Format a stored metric value by its unit. */
export function fmtMetricValue(value: number | string | null, unit: string): string {
  if (value === null) throw new Error("fmtMetricValue: null must be rendered through MissingValue, never formatted");
  if (typeof value === "string") return value;
  if (unit === "percent") return fmtPct(value, 1);
  return Number.isInteger(value) ? fmtInt(value) : fmtDec(value, 2);
}

/** Signed difference "+4 (+0.007 %)". */
export function fmtSigned(value: number, decimals = 0): string {
  const s = decimals === 0 ? fmtInt(Math.abs(value)) : fmtDec(Math.abs(value), decimals);
  return `${value > 0 ? "+" : value < 0 ? "−" : "±"}${s}`;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "2026-10-08T22:21:29Z" → "2026-10-08 22:21:29 UTC" */
export function fmtUtc(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)Z$/.exec(iso);
  return m ? `${m[1]} ${m[2]} UTC` : iso;
}

/** "2026-10-09" → "9 Oct 2026" */
export function fmtDayShort(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]!.slice(0, 3)} ${m[1]}`;
}

/** "2026-10-09 00:21:29 (UTC+2)" → "9 Oct 2026 00:21:29 in Skopje (UTC+2)" */
export function fmtLocal(local: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)(?:[–-](\d{2}:\d{2}(?::\d{2})?))? \(UTC\+2\)$/.exec(local);
  if (!m) return local.replace(" (UTC+2)", " in Skopje (UTC+2)");
  return `${fmtDayShort(m[1]!)} ${m[2]}${m[3] ? `–${m[3]}` : ""} in Skopje (UTC+2)`;
}

/**
 * Validation-reading times are stored as recorded in Phase 1, sometimes as a window or a bound.
 * This renders them in words without changing what they say.
 */
export function fmtReadingTime(t: string): string {
  let m = /^(\d{4}-\d{2}-\d{2}) after S2, before (\d{2}:\d{2})Z$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, after S2 and before ${m[2]} UTC (exact capture time not recorded)`;
  m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})Z \(page update time\)$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, ${m[2]} UTC (time the page reports for its last update)`;
  m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})-(\d{2}:\d{2})Z window$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, between ${m[2]} and ${m[3]} UTC`;
  m = /^<= (\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})Z$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, at or before ${m[2]} UTC`;
  m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})Z\/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})Z$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, ${m[2]}–${m[4]} UTC`;
  return t;
}

/** Reading time without the long caveat, for dense tables: "9 Oct 2026, after S2, before 11:13 UTC". */
export function fmtReadingTimeShort(t: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) after S2, before (\d{2}:\d{2})Z$/.exec(t);
  if (m) return `${fmtDayShort(m[1]!)}, after S2, before ${m[2]} UTC`;
  return fmtReadingTime(t);
}

/** A visible reading as typed on the page: plain digit strings get separators; text such as "76K" stays as read. */
export function fmtReadingValue(visibleValue: string, visibleNumber: number | null): string {
  if (visibleNumber !== null && /^\d+$/.test(visibleValue.trim())) return fmtInt(visibleNumber);
  return visibleValue;
}

const UNIT_PLURAL: Record<string, string> = {
  "dataset (CKAN package)": "datasets (CKAN packages)",
  organisation: "organisations",
  dataset: "datasets",
  "raw label": "raw labels",
  extension: "extensions",
  resource: "resources",
  assignment: "assignments",
  group: "groups",
  "directory record": "directory records",
  "metadata record": "metadata records",
  "file or link": "files or links",
  API: "APIs",
  "aggregated metadata record": "aggregated metadata records",
  "register record": "register records",
  "format URI": "format URIs",
  reuse: "reuses",
  record: "records",
};

/** Unit word after a count: singular for exactly 1, plural otherwise. "version" and "percent" print no unit. */
export function unitText(unit: string, value: number | string): string {
  if (unit === "percent" || unit === "version" || typeof value === "string") return "";
  if (value === 1) return unit;
  return UNIT_PLURAL[unit] ?? unit;
}
