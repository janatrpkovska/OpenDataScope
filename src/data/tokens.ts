// Token grammar. Content text never contains a statistic; it contains tokens:
//   {v:id}            a metric value, formatted (metrics with unit "percent" get " %")
//   {pct:a/b}         share a ÷ b, 1 decimal      (a, b = metric ids or derived ids)
//   {pct2:a/b}        share a ÷ b, 2 decimals
//   {d:id}            a derived value from derive.ts
// Some project copy quotes values that live in Phase 1 tables rather than metrics.csv.
// These values are read through table tokens rather than typed directly into copy:
// (e.g. GOVE 312 datasets, JSON 7 resources, Serbia 3,527 records). They are read through
//   {t:table|key|column}   a Phase 1 table cell, formatted as a count
//   {tp:table|key|column}  a Phase 1 table cell that is already a percentage
// so that no number is ever typed into copy.
import { NBSP, fmtDec, fmtInt, fmtMetricValue, fmtPct, fmtReadingValue, fmtSigned, share } from "./format";
import type { DerivedValue, Metric, TokenLogEntry, ValidationReading } from "./types";

export const TOKEN_RE = /\{(v|pct|pct2|d|t|tp|r):([^}]+)\}/g;

export interface TokenContext {
  metric(id: string): Metric | undefined;
  derived(id: string): DerivedValue | undefined;
  table(table: string, key: string, column: string): string | undefined;
  /** A validation reading as recorded in validation_readings.csv (methodology checks quote readings). */
  reading?(id: string): ValidationReading | undefined;
}

export class TokenError extends Error {
  constructor(
    message: string,
    public readonly where: string,
    public readonly token: string,
  ) {
    super(`${where}: ${message} (${token})`);
    this.name = "TokenError";
  }
}

export function formatDerived(d: DerivedValue): string {
  if (d.unit === "percent") return fmtPct(d.value, d.decimals === 2 ? 2 : 1);
  if (d.unit === "ratio") return fmtDec(d.value, d.decimals);
  return fmtInt(d.value);
}

function numericOperand(ctx: TokenContext, id: string, where: string, token: string): number {
  const m = ctx.metric(id);
  if (m) {
    if (typeof m.value !== "number") throw new TokenError(`operand ${id} is not numeric`, where, token);
    return m.value;
  }
  const d = ctx.derived(id);
  if (d) {
    if (d.unit !== "count") throw new TokenError(`derived operand ${id} is not a count`, where, token);
    return d.value;
  }
  throw new TokenError(`unknown operand ${id}`, where, token);
}

export interface RenderResult {
  text: string;
  inputs: string[]; // metric ids, derived ids (prefixed "derived."), table refs (prefixed "table:")
  log: TokenLogEntry[];
}

export function renderTemplate(template: string, ctx: TokenContext, where: string): RenderResult {
  const inputs: string[] = [];
  const log: TokenLogEntry[] = [];
  const text = template.replace(TOKEN_RE, (token: string, kind: string, ref: string) => {
    let rendered: string;
    let used: string[];
    if (kind === "v") {
      const m = ctx.metric(ref);
      if (!m) throw new TokenError(`unknown metric ${ref}`, where, token);
      rendered = fmtMetricValue(m.value, m.unit);
      used = [ref];
    } else if (kind === "pct" || kind === "pct2") {
      const parts = ref.split("/");
      if (parts.length !== 2) throw new TokenError("expected a/b", where, token);
      const [a, b] = parts as [string, string];
      rendered = fmtPct(share(numericOperand(ctx, a, where, token), numericOperand(ctx, b, where, token)), kind === "pct2" ? 2 : 1);
      used = [a, b].map((id) => (ctx.metric(id) ? id : `derived.${id}`));
    } else if (kind === "d") {
      const d = ctx.derived(ref);
      if (!d) throw new TokenError(`unknown derived value ${ref}`, where, token);
      rendered = formatDerived(d);
      used = [`derived.${ref}`];
    } else if (kind === "r") {
      // {r:readingId|value} visible value as read; {r:readingId|diff} signed difference; {r:readingId|diffpct} stored drift %
      const [id, field] = ref.split("|") as [string, string | undefined];
      const r = ctx.reading?.(id);
      if (!r) throw new TokenError(`unknown reading ${id}`, where, token);
      if (field === "value") rendered = fmtReadingValue(r.visibleValue, r.visibleNumber);
      else if (field === "diff" && r.difference !== null) rendered = fmtSigned(r.difference);
      else if (field === "diffpct" && r.differencePct !== null) rendered = `${fmtSigned(r.differencePct, 3)}${NBSP}%`;
      else throw new TokenError(`reading ${id} has no numeric ${field ?? "field"}`, where, token);
      used = [`reading:${id}`];
    } else {
      const parts = ref.split("|");
      if (parts.length !== 3) throw new TokenError("expected table|key|column", where, token);
      const [table, key, column] = parts as [string, string, string];
      const raw = ctx.table(table, key, column);
      if (raw === undefined || raw.trim() === "") throw new TokenError(`no table cell ${table}[${key}].${column}`, where, token);
      const num = Number(raw);
      if (!Number.isFinite(num)) throw new TokenError(`table cell is not numeric: ${raw}`, where, token);
      const decimals = raw.includes(".") ? raw.split(".")[1]!.length : 0;
      rendered = kind === "tp" ? fmtPct(num, decimals === 2 ? 2 : 1) : decimals ? fmtDec(num, decimals) : fmtInt(num);
      used = [`table:${table}|${key}|${column}`];
    }
    inputs.push(...used);
    log.push({ where, token, rendered, inputs: used });
    return rendered;
  });
  return { text, inputs: [...new Set(inputs)], log };
}

/** Metric ids (not derived or table refs) used by a rendered template, in order. */
export function metricInputs(inputs: string[]): string[] {
  return inputs.filter((i) => !i.startsWith("derived.") && !i.startsWith("table:"));
}
