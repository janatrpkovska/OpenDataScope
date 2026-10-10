"use client";
// C9: bars on a fixed 0–100 % axis. Labels use 1 decimal; the tooltip prints n / N = share to
// 2 decimals with the query and layer, so the Netherlands' 81.68 % from the brief is visible there.
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback } from "react";
import type { PercentRow, SourceTarget } from "@/data/types";
import { fmtFraction, fmtShare } from "@/data/format";
import { metricLabel } from "@/content/metricLabels";
import { ChartFrame, KEY_HINT, TooltipBox, useChartSource, useIsMobile, useWidth } from "./kit";

// The numerator's label comes from the metric-label table (src/content), so no period is typed here.
const NUMERATOR_LABEL = metricLabel("records_metadata_modified_12m");

export function PercentBars({ rows, title, details }: { rows: PercentRow[]; title: string; details?: (r: PercentRow) => { label: string; value: string }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const mobile = useIsMobile();
  const getTarget = useCallback((r: PercentRow): SourceTarget => ({ metricId: r.metricIds[0]! }), []);
  const { setActive, onKeyDown, openRow } = useChartSource(getTarget);
  const rowH = mobile ? 52 : 40;
  const height = rows.length * rowH + 32;
  const labelW = mobile ? 0 : Math.min(Math.round(width * 0.28), 180);

  const Name = (p: { x?: number | string; y?: number | string; payload?: { index: number } }) => {
    const r = rows[p.payload?.index ?? 0];
    if (!r) return <g />;
    const mk = r.portalId === "mk";
    if (mobile) {
      return (
        <text x={4} y={Number(p.y ?? 0) - rowH / 2 + 12} fontSize={12} fontWeight={mk ? 600 : 500} fill={mk ? "var(--portal-mk)" : "var(--ink)"}>
          {r.label}
        </text>
      );
    }
    return (
      <text x={Number(p.x ?? 0)} y={Number(p.y ?? 0)} dy={4} textAnchor="end" fontSize={13} fontWeight={mk ? 600 : 500} fill={mk ? "var(--portal-mk)" : "var(--ink)"}>
        {r.label}
      </text>
    );
  };
  const Pct = (p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) => {
    const r = rows[p.index ?? 0];
    if (!r) return null;
    return (
      <text x={Number(p.x ?? 0) + Number(p.width ?? 0) + 6} y={Number(p.y ?? 0) + Number(p.height ?? 0) / 2} dy={4} fontSize={12} fontWeight={r.portalId === "mk" ? 600 : 500} fill="var(--ink)">
        {fmtShare(r.numerator, r.denominator, 1)}
      </text>
    );
  };

  return (
    <ChartFrame height={height} onKeyDown={onKeyDown} widthRef={ref}>
      {width > 0 ? (
        <BarChart width={width} height={height} data={rows} layout="vertical" margin={{ top: mobile ? 16 : 4, right: 56, bottom: 4, left: mobile ? 4 : 0 }} barCategoryGap={mobile ? 14 : 10} title={title} desc={KEY_HINT}>
          <CartesianGrid horizontal={false} stroke="var(--rule)" />
          <XAxis type="number" dataKey="pct" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v} %`} tick={{ fontSize: 12, fill: "var(--ink-muted)" }} stroke="var(--rule)" />
          <YAxis type="category" dataKey="label" width={Math.max(labelW, 1)} tick={Name} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)", fillOpacity: 0.5 }}
            isAnimationActive={false}
            content={(tp) => {
              const r = (tp.payload?.[0]?.payload as PercentRow | undefined) ?? null;
              return (
                <TooltipBox<PercentRow>
                  active={!!tp.active}
                  row={r}
                  onActive={setActive}
                  title={r?.label}
                  fields={r ? [{ label: NUMERATOR_LABEL, value: fmtFraction(r.numerator, r.denominator) }, ...(details ? details(r) : [])] : []}
                />
              );
            }}
          />
          <Bar dataKey="pct" isAnimationActive={false} maxBarSize={20} onClick={(d) => openRow(d.payload as PercentRow)} style={{ cursor: "pointer" }}>
            {rows.map((r) => (
              <Cell key={r.portalId} fill={r.portalId === "mk" ? "var(--portal-mk)" : "var(--portal-national)"} />
            ))}
            <LabelList dataKey="pct" content={Pct} />
          </Bar>
        </BarChart>
      ) : null}
    </ChartFrame>
  );
}
