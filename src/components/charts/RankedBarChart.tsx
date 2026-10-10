"use client";
// Ranked horizontal bars with value and share labels (C3, C5, C11, C12, C13).
// Desktop: label column up to 35 % of the width. Mobile: the label sits above its bar and the bar uses the
// full width. A zero is drawn as an explicit marker with its evidence label (C12, C13 North Macedonia).
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback, useId } from "react";
import type { BarRow, SourceTarget } from "@/data/types";
import { fmtInt } from "@/data/format";
import { ChartFrame, KEY_HINT, Patterns, TooltipBox, fillFor, niceTicks, strokeFor, useChartSource, useIsMobile, useWidth } from "./kit";

export function RankedBarChart({
  rows,
  title,
  fallbackTarget,
  maxRows,
  compact = false,
  zeroLabel,
  boldKeys = ["mk"],
}: {
  rows: BarRow[];
  title: string;
  fallbackTarget: SourceTarget;
  maxRows?: number;
  compact?: boolean;
  /** Text printed at an explicit zero marker. Defaults to the row's own value label. */
  zeroLabel?: string;
  boldKeys?: string[];
}) {
  const shown = maxRows ? rows.slice(0, maxRows) : rows;
  const [ref, width] = useWidth<HTMLDivElement>();
  const mobile = useIsMobile();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { eu: `${uid}-eu`, none: `${uid}-none` };
  const getTarget = useCallback((r: BarRow): SourceTarget => (r.metricId ? { metricId: r.metricId } : fallbackTarget), [fallbackTarget]);
  const { setActive, onKeyDown, openRow } = useChartSource(getTarget);

  const rowH = mobile ? 46 : compact ? 26 : 32;
  const height = shown.length * rowH + 32;
  const labelW = mobile ? 0 : Math.min(Math.round(width * 0.35), 260);
  const max = Math.max(...shown.map((r) => r.value), 1);
  // leave room for the value label after the longest bar
  const valueChars = Math.max(...shown.map((r) => r.valueLabel.length));
  const labelRoom = Math.min(valueChars * 6.6 + 16, width * 0.45);
  const plotW = Math.max(width - labelW - 16, 1);
  const needed = (max * plotW) / Math.max(plotW - labelRoom, plotW * 0.4);
  const ticks = niceTicks(needed, mobile ? 3 : 4);
  const domainMax = ticks[ticks.length - 1]!;
  const plotLeft = mobile ? 4 : labelW;

  const Name = (p: { x?: number | string; y?: number | string; payload?: { index: number } }) => {
    const r = shown[p.payload?.index ?? 0];
    if (!r) return <g />;
    const bold = boldKeys.includes(r.key);
    const color = bold ? "var(--portal-mk)" : "var(--ink)";
    const cy = Number(p.y ?? 0);
    // An explicit zero: a marker on the axis with its evidence label
    const zero =
      r.value === 0 ? (
        <g data-zero-marker={r.key}>
          <line x1={plotLeft + 1} x2={plotLeft + 1} y1={cy - 9} y2={cy + 9} stroke="var(--portal-mk)" strokeWidth={3} />
          <text x={plotLeft + 9} y={cy} dy={4} fontSize={12} fontWeight={600} fill="var(--portal-mk)">
            {zeroLabel ?? r.valueLabel}
          </text>
        </g>
      ) : null;
    if (mobile) {
      return (
        <g>
          <text x={4} y={cy - rowH / 2 + 13} fontSize={12} fontWeight={bold ? 600 : 500} fill={color}>
            {r.label}
          </text>
          {zero}
        </g>
      );
    }
    const words = r.label.split(" ");
    // wrap long names onto two lines inside the label column
    const maxChars = Math.max(Math.floor(labelW / 6.8), 8);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    lines.push(cur);
    const two = lines.length > 1 && !compact ? [lines[0]!, lines.slice(1).join(" ")] : [lines.join(" ")];
    const shownLines = two.map((l) => (l.length > maxChars + 6 ? l.slice(0, maxChars + 4) + "…" : l));
    return (
      <g>
        <text x={Number(p.x ?? 0)} y={cy} textAnchor="end" fontSize={compact ? 12 : 13} fontWeight={bold ? 600 : 500} fill={color}>
          {shownLines.map((l, i) => (
            <tspan key={i} x={Number(p.x ?? 0)} dy={shownLines.length === 1 ? 4 : i === 0 ? -3 : 13}>
              {l}
            </tspan>
          ))}
        </text>
        {zero}
      </g>
    );
  };

  const ValueLabel = (p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) => {
    const r = shown[p.index ?? 0];
    if (!r) return null;
    const x = Number(p.x ?? 0) + Number(p.width ?? 0);
    const y = Number(p.y ?? 0) + Number(p.height ?? 0) / 2;
    const bold = boldKeys.includes(r.key);
    if (r.value === 0) return null; // drawn with the row name, see Name
    return (
      <text x={x + 6} y={y} dy={4} fontSize={12} fontWeight={bold ? 600 : 500} fill="var(--ink)">
        {r.valueLabel}
      </text>
    );
  };

  return (
    <ChartFrame height={height} onKeyDown={onKeyDown} widthRef={ref}>
      {width > 0 ? (
        <BarChart
          width={width}
          height={height}
          data={shown}
          layout="vertical"
          margin={{ top: mobile ? 16 : 4, right: 8, bottom: 4, left: mobile ? 4 : 0 }}
          barCategoryGap={mobile ? 18 : compact ? 5 : 8}
          title={title}
          desc={KEY_HINT}
        >
          <Patterns ids={ids} />
          <CartesianGrid horizontal={false} stroke="var(--rule)" />
          <XAxis type="number" domain={[0, domainMax]} ticks={ticks} tickFormatter={(v: number) => fmtInt(v)} tick={{ fontSize: 12, fill: "var(--ink-muted)" }} stroke="var(--rule)" allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={Math.max(labelW, 1)} tick={Name} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)", fillOpacity: 0.5 }}
            isAnimationActive={false}
            content={(tp) => {
              const r = (tp.payload?.[0]?.payload as BarRow | undefined) ?? null;
              return (
                <TooltipBox<BarRow>
                  active={!!tp.active}
                  row={r}
                  onActive={setActive}
                  title={r?.label}
                  fields={(r?.tooltip ?? []).map((f) => ({ ...f, lang: /Macedonian/.test(f.label) ? "mk" : undefined }))}
                />
              );
            }}
          />
          <Bar dataKey="value" isAnimationActive={false} maxBarSize={20} onClick={(d) => openRow(d.payload as BarRow)} style={{ cursor: "pointer" }}>
            {shown.map((r) => (
              <Cell key={r.key} fill={fillFor(r.colorKey, ids)} {...strokeFor(r.colorKey)} />
            ))}
            <LabelList dataKey="value" content={ValueLabel} />
          </Bar>
        </BarChart>
      ) : null}
    </ChartFrame>
  );
}
