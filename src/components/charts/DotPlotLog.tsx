"use client";
// C1: catalogue size of the national portals. Default: dots on a log10 axis with ticks at
// 1K, 10K, 100K and 1M; the ScaleToggle switches to linear bars (a bar on a log axis would not be
// proportional to its value). The EU aggregator and Serbia are never passed in: the view model only holds
// national portals, and this component refuses anything else.
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback, useId } from "react";
import type { SizeRow, SourceTarget } from "@/data/types";
import { MISSING } from "@/content/copy";
import { fmtInt } from "@/data/format";
import { ChartFrame, KEY_HINT, TooltipBox, useChartSource, useIsMobile, useWidth } from "./kit";

export type Scale = "log" | "linear";

const LOG_TICKS = [1_000, 10_000, 100_000, 1_000_000];
const LOG_DOMAIN: [number, number] = [300, 1_000_000];
const tickLabel = (v: number) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${v / 1_000}K` : String(v));

export function ScaleToggle({ value, onChange }: { value: Scale; onChange: (s: Scale) => void }) {
  const uid = useId();
  return (
    <fieldset className="seg" data-scale-toggle>
      <legend className="sr-only">Axis scale</legend>
      {(["log", "linear"] as const).map((s) => (
        <label key={s}>
          <input type="radio" className="sr-only" name={`${uid}-scale`} value={s} checked={value === s} onChange={() => onChange(s)} />
          {s === "log" ? "Log scale" : "Linear scale"}
        </label>
      ))}
    </fieldset>
  );
}

export function DotPlotLog({ rows, scale, title }: { rows: SizeRow[]; scale: Scale; title: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const mobile = useIsMobile();
  const getTarget = useCallback((r: SizeRow): SourceTarget => ({ metricId: r.metricId }), []);
  const { setActive, onKeyDown, openRow } = useChartSource(getTarget);
  if (rows.some((r) => r.portalId === "eu" || r.portalId === "rs")) {
    throw new Error("C1 draws national portals only; the EU aggregator and Serbia never appear on this axis");
  }
  const rowH = mobile ? 56 : 44;
  const height = rows.length * rowH + 40;
  const labelW = mobile ? 0 : Math.min(190, Math.round(width * 0.3));
  const data = rows.map((r) => ({ ...r, plot: r.value === null ? null : r.value }));
  const maxLinear = Math.max(...rows.map((r) => r.value ?? 0));

  // Value label "768 datasets" beside the dot; flipped to the left near the right edge.
  const ValueLabel = (p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) => {
    const r = rows[p.index ?? 0];
    if (!r) return null;
    const x = Number(p.x ?? 0) + Number(p.width ?? 0);
    const y = Number(p.y ?? 0) + Number(p.height ?? 0) / 2;
    if (r.value === null) {
      return (
        <text x={labelW + 8} y={y} dy={4} fontSize={12} fontStyle="italic" fill="var(--status-context)">
          {MISSING[r.missingReason ?? "not_reliably_available"].label}
        </text>
      );
    }
    const text = `${fmtInt(r.value)} ${r.unitLabel}`;
    const plotRight = width - 12;
    const estWidth = text.length * 6.7;
    const flip = x + 10 + estWidth > plotRight;
    return (
      <text
        x={flip ? x - 10 : x + 10}
        y={y}
        dy={4}
        textAnchor={flip ? "end" : "start"}
        fontSize={12}
        fontWeight={r.isReference ? 600 : 500}
        fill={r.isReference ? "var(--portal-mk)" : "var(--ink)"}
      >
        {text}
      </text>
    );
  };

  // Log mode: an invisible bar from the axis start; its shape draws only the dot at the value.
  const DotShape = (p: { x?: number; y?: number; width?: number; height?: number; payload?: SizeRow }) => {
    const r = p.payload;
    if (!r || r.value === null) return <g />;
    const cx = (p.x ?? 0) + (p.width ?? 0);
    const cy = (p.y ?? 0) + (p.height ?? 0) / 2;
    return (
      <g style={{ cursor: "pointer" }}>
        <line x1={labelW} x2={cx} y1={cy} y2={cy} stroke="var(--rule)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={5} fill={r.isReference ? "var(--portal-mk)" : "var(--portal-national)"} stroke="#fff" strokeWidth={1} />
      </g>
    );
  };
  const BarShape = (p: { x?: number; y?: number; width?: number; height?: number; payload?: SizeRow }) => {
    const r = p.payload;
    if (!r || r.value === null) return <g />;
    return <rect x={p.x} y={(p.y ?? 0) + ((p.height ?? 0) - 20) / 2} width={Math.max(p.width ?? 0, 1)} height={20} fill={r.isReference ? "var(--portal-mk)" : "var(--portal-national)"} style={{ cursor: "pointer" }} />;
  };

  // Desktop: portal name with a unit chip; mobile: the name sits above each row.
  const NameTick = (p: { x?: number | string; y?: number | string; payload?: { value: string; index: number } }) => {
    const r = rows[p.payload?.index ?? 0];
    if (!r) return <g />;
    const y = Number(p.y ?? 0);
    if (mobile) {
      return (
        <text x={4} y={y - rowH / 2 + 14} fontSize={12} fontWeight={r.isReference ? 600 : 500} fill={r.isReference ? "var(--portal-mk)" : "var(--ink)"}>
          {r.label} <tspan fill="var(--ink-muted)" fontWeight={400}>· {r.unitLabel}</tspan>
        </text>
      );
    }
    return (
      <g>
        <text x={Number(p.x ?? 0)} y={y} dy={-2} textAnchor="end" fontSize={13} fontWeight={r.isReference ? 600 : 500} fill={r.isReference ? "var(--portal-mk)" : "var(--ink)"}>
          {r.label}
        </text>
        <text x={Number(p.x ?? 0)} y={y} dy={13} textAnchor="end" fontSize={11} fill="var(--ink-muted)">
          {r.unitLabel}
        </text>
      </g>
    );
  };

  return (
    <ChartFrame height={height} onKeyDown={onKeyDown} widthRef={ref}>
      {width > 0 ? (
        <BarChart
          width={width}
          height={height}
          data={data}
          layout="vertical"
          margin={{ top: mobile ? 14 : 4, right: 12, bottom: 4, left: mobile ? 4 : 0 }}
          barCategoryGap={mobile ? 22 : 12}
          title={title}
          desc={KEY_HINT}
        >
          <CartesianGrid horizontal={false} stroke="var(--rule)" />
          {scale === "log" ? (
            <XAxis type="number" scale="log" domain={LOG_DOMAIN} ticks={LOG_TICKS} allowDataOverflow tickFormatter={tickLabel} tick={{ fontSize: 12, fill: "var(--ink-muted)" }} stroke="var(--rule)" />
          ) : (
            <XAxis type="number" domain={[0, Math.ceil(maxLinear / 100_000) * 100_000]} tickFormatter={tickLabel} tick={{ fontSize: 12, fill: "var(--ink-muted)" }} stroke="var(--rule)" />
          )}
          <YAxis type="category" dataKey="label" width={Math.max(labelW, 1)} tick={NameTick} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)", fillOpacity: 0.5 }}
            isAnimationActive={false}
            content={(tp) => {
              const r = (tp.payload?.[0]?.payload as SizeRow | undefined) ?? null;
              return (
                <TooltipBox<SizeRow>
                  active={!!tp.active}
                  row={r}
                  onActive={setActive}
                  title={r?.label}
                  fields={
                    r
                      ? [
                          { label: "Canonical count", value: r.value === null ? MISSING[r.missingReason ?? "not_reliably_available"].label : `${fmtInt(r.value)} ${r.unitLabel}` },
                          { label: "Count definition", value: r.definition },
                          { label: "Snapshot", value: r.layerTime },
                          { label: "Comparability", value: r.comparabilityNote },
                          { label: "Later reading", value: r.validation ?? "None registered" },
                        ]
                      : []
                  }
                />
              );
            }}
          />
          <Bar
            dataKey={scale === "log" ? "plot" : "value"}
            isAnimationActive={false}
            shape={scale === "log" ? DotShape : BarShape}
            onClick={(d) => openRow(d.payload as SizeRow)}
            minPointSize={scale === "log" ? 0 : 1}
          >
            <LabelList dataKey="value" content={ValueLabel} />
          </Bar>
        </BarChart>
      ) : null}
    </ChartFrame>
  );
}
