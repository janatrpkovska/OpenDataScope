"use client";
// Frame for every chart: <figure> whose <figcaption> holds the finding title and the
// generated one-sentence summary; subtitle with unit and scope; comparability badge or project-indicator
// label; a Chart/Table radio group; the source line with "View source"; and a <noscript> table.
import { useId, useState, type ReactNode } from "react";
import type { ChartModel, Column, MissingReason, Row } from "@/data/types";
import { MISSING } from "@/content/copy";
import { ComparabilityBadge, ProjectIndicatorLabel } from "@/components/ui/Badges";
import { DataTable, formatCell } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/Notes";
import { ViewSource } from "@/components/source/SourceBadge";

function noscriptCell(r: Row, c: Column): string {
  const v = r[c.key];
  if (v === null || v === undefined) {
    const reason = r[`${c.key}__missing`] as MissingReason | undefined;
    if (!reason) throw new Error(`chart table: null in ${c.key} without a missing-value reason`);
    return MISSING[reason].label;
  }
  return formatCell(v, c);
}

export function ChartCard({
  model,
  children,
  empty = false,
  emptyState,
  controls,
  footer,
  className = "",
}: {
  model: ChartModel;
  children: ReactNode;
  /** Every input is null or empty: show EmptyState instead of the chart. */
  empty?: boolean;
  /** Override the empty-state copy (Compare with too few portals: "Select at least two national portals."). */
  emptyState?: { title: string; body: string };
  /** Extra controls beside the Chart/Table switch (C1's scale toggle). */
  controls?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const uid = useId();
  const titleId = `${uid}-title`;
  return (
    <figure className={`card flex min-w-0 flex-col p-4 lg:p-6 ${className}`} aria-labelledby={titleId} data-chart={model.id}>
      <figcaption>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h3 id={titleId} className="max-w-[60ch]">
            {model.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {model.status ? <ComparabilityBadge status={model.status} reason={model.statusNote ?? undefined} /> : null}
            {model.projectIndicator ? <ProjectIndicatorLabel rule={model.projectIndicator} /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm leading-5 text-ink-muted">{model.subtitle}</p>
        {model.statusNote ? (
          <p className="mt-1 text-sm leading-5 text-ink" data-chart-warning>
            {model.statusNote}
          </p>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-ink-muted" data-chart-summary>
          <span className="font-medium">In words: </span>
          {model.summary}
        </p>
      </figcaption>

      {empty ? (
        <div className="mt-4">
          {emptyState ? (
            <EmptyState title={emptyState.title} body={emptyState.body} />
          ) : (
            <EmptyState title="Not reliably available from the official source" body="This chart has no value to draw for the snapshot." source={model.sourceTarget} />
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <fieldset className="seg" data-view-switch>
              <legend className="sr-only">Show this chart as</legend>
              {(["chart", "table"] as const).map((v) => (
                <label key={v}>
                  <input
                    type="radio"
                    name={`${uid}-view`}
                    value={v}
                    checked={view === v}
                    onChange={() => setView(v)}
                    className="sr-only"
                  />
                  {v === "chart" ? "Chart" : "Table"}
                </label>
              ))}
            </fieldset>
            {view === "chart" ? controls : null}
          </div>
          <div className="mt-3 min-w-0">
            {view === "chart" ? (
              <div className="chart-js-only">{children}</div>
            ) : (
              <DataTable caption={model.table.caption} columns={model.table.columns} rows={model.table.rows} />
            )}
          </div>
          {/* Without JavaScript the chart is replaced by its data table. */}
          <noscript>
            <table className="data-table">
              <caption>{model.table.caption}</caption>
              <thead>
                <tr>
                  {model.table.columns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.table.rows.map((r, i) => (
                  <tr key={i}>
                    {model.table.columns.map((c) => (
                      <td key={c.key}>{noscriptCell(r, c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </noscript>
        </>
      )}

      {model.annotation && !empty ? <p className="mt-3 text-sm leading-6 text-ink">{model.annotation}</p> : null}
      {model.note ? <p className="mt-2 text-sm leading-6 text-ink-muted">{model.note}</p> : null}
      {footer}
      <p className="mt-4 border-t border-rule pt-3 text-xs leading-5 text-ink-muted">
        {model.sourceLine} · <ViewSource target={model.sourceTarget} className="text-xs" /> ·{" "}
        <ViewSource target={{ statement: `chart.${model.id}` }} className="text-xs">
          Values in this chart
        </ViewSource>
      </p>
    </figure>
  );
}
