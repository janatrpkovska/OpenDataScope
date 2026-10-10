"use client";
// Accessible table with optional sorting and collapse.
// - <caption>, <th scope>, sort buttons with aria-sort.
// - A null cell renders its missing-value reason in words (row key `${col}__missing`, else the column's
//   `missingReason`); a null without a reason is a programming error and fails the static build.
// - Missing values sort last whatever the direction (O2.4).
// - Below 768 px rows become label–value cards, except `mobile="scroll"` (the validation register), which keeps
//   a sideways-scrolling table with the caption "Scroll sideways to see all columns". From 768 px every DataTable
//   is a table.
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Column, MissingReason, Row } from "@/data/types";
import { fmtDec, fmtInt, fmtPct } from "@/data/format";
import { MissingValue } from "./Badges";

export interface DataColumn extends Column {
  missingReason?: MissingReason;
  sortable?: boolean;
}

function sortValue(v: string | number | null): number | string | null {
  if (v === null) return null;
  if (typeof v === "number") return v;
  const t = v.replace(/[, %]/g, "").replace("−", "-").trim();
  const m = /^[-+]?\d+(\.\d+)?/.exec(t);
  return m && m[0].length === t.length ? Number(t) : v.toLowerCase();
}

export function formatCell(v: string | number, c: Column): string {
  if (typeof v === "string") return v;
  switch (c.format) {
    case "pct1":
      return fmtPct(v, 1);
    case "pct2":
      return fmtPct(v, 2);
    case "int":
      return fmtInt(v);
    default:
      return Number.isInteger(v) ? fmtInt(v) : fmtDec(v, 2);
  }
}

export function DataTable({
  caption,
  columns,
  rows,
  sortable = false,
  collapsedRows,
  mobile = "cards",
  captionHidden = false,
  renderCell,
  id,
}: {
  caption: string;
  columns: DataColumn[];
  rows: Row[];
  sortable?: boolean;
  collapsedRows?: number;
  mobile?: "cards" | "scroll";
  captionHidden?: boolean;
  renderCell?: (row: Row, col: DataColumn) => ReactNode | undefined;
  id?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "ascending" | "descending" } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = sortValue(a[sort.key] ?? null);
      const vb = sortValue(b[sort.key] ?? null);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // missing last, whatever the direction
      if (vb === null) return -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "ascending" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const limit = collapsedRows && !expanded ? collapsedRows : sorted.length;
  const visible = sorted.slice(0, limit);
  const hiddenCount = sorted.length - visible.length;

  const cell = (row: Row, c: DataColumn): ReactNode => {
    const custom = renderCell?.(row, c);
    if (custom !== undefined) return custom;
    const v = row[c.key];
    if (v === null || v === undefined) {
      const reason = (row[`${c.key}__missing`] as MissingReason | undefined) ?? c.missingReason;
      if (!reason) throw new Error(`DataTable "${caption}": null in column ${c.key} without a missing-value reason`);
      return <MissingValue reason={reason} />;
    }
    const text = formatCell(v, c);
    return c.lang ? <span lang={c.lang}>{text}</span> : text;
  };

  const toggleSort = (key: string) =>
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === "ascending" ? "descending" : "ascending" } : { key, dir: "descending" }));

  const showTable = "hidden md:block";
  const showSmall = "md:hidden";
  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const rest = columns.filter((c) => c !== primary);

  const table = (
    <table className="data-table" id={id}>
      <caption className={captionHidden ? "sr-only" : undefined}>
        {caption}
        {mobile === "scroll" ? <span className="block text-xs font-normal text-ink-muted md:hidden">Scroll sideways to see all columns</span> : null}
      </caption>
      <thead>
        <tr>
          {columns.map((c) => {
            const canSort = sortable && c.sortable !== false;
            const active = sort?.key === c.key;
            return (
              <th
                key={c.key}
                scope="col"
                className={c.align === "right" ? "num" : undefined}
                aria-sort={canSort ? (active ? sort!.dir : "none") : undefined}
              >
                {canSort ? (
                  <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-accent">
                    {c.header}
                    {active ? (
                      sort!.dir === "ascending" ? <ArrowUp aria-hidden="true" size={12} /> : <ArrowDown aria-hidden="true" size={12} />
                    ) : (
                      <ArrowUpDown aria-hidden="true" size={12} />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {visible.map((row, i) => (
          <tr key={i}>
            {columns.map((c) =>
              c === primary ? (
                <th key={c.key} scope="row" className={`font-medium text-ink ${c.align === "right" ? "num" : ""}`} style={{ fontSize: 14, lineHeight: "20px" }}>
                  {cell(row, c)}
                </th>
              ) : (
                <td key={c.key} className={c.align === "right" ? "num" : undefined}>
                  {cell(row, c)}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="data-table-wrap">
      {mobile === "scroll" ? (
        <>
          <div className={showTable}>{table}</div>
          {/* Below the table breakpoint the register keeps its table and scrolls sideways inside this region.
              A scrollable region must be reachable by keyboard so it can be scrolled without a mouse (WCAG 2.1.1). */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className={`scroll-x ${showSmall}`} tabIndex={0} role="region" aria-label={`${caption} (scrollable)`}>
            <div className="min-w-[760px]">{table}</div>
          </div>
        </>
      ) : (
        <>
          <div className={showTable}>{table}</div>
          <div className={showSmall}>
            <p className={`mb-2 text-sm font-semibold ${captionHidden ? "sr-only" : ""}`}>{caption}</p>
            <ul className="table-cards space-y-2">
              {visible.map((row, i) => (
                <li key={i} className="rounded-lg border border-rule bg-surface px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{cell(row, primary)}</p>
                  <dl className="mt-1 grid grid-cols-[minmax(0,40%)_1fr] gap-x-3 gap-y-0.5 text-sm leading-5">
                    {rest.map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-ink-muted">{c.header}</dt>
                        <dd className="text-ink">{cell(row, c)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {collapsedRows && sorted.length > collapsedRows ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 rounded-md border border-rule bg-surface px-3 py-1.5 text-sm font-medium text-accent hover:border-accent"
        >
          {expanded ? "Show fewer rows" : `Show all ${fmtInt(sorted.length)} rows (${fmtInt(hiddenCount)} more)`}
        </button>
      ) : null}
    </div>
  );
}
