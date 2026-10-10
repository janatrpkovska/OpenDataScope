"use client";
// C4: two series per theme, North Macedonia (accent) and the EU-portal profile (violet, hatched), as a share
// of each side's theme assignments.
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback, useId } from "react";
import type { PairedRow, SeriesSpec, SourceTarget } from "@/data/types";
import { fmtPct } from "@/data/format";
import { ChartFrame, KEY_HINT, Legend, Patterns, TooltipBox, fillFor, strokeFor, useChartSource, useIsMobile, useWidth } from "./kit";

export function PairedBarChart({
  rows,
  series,
  title,
  target,
  emphasise = "a",
}: {
  rows: PairedRow[];
  series: [SeriesSpec, SeriesSpec];
  title: string;
  target: SourceTarget;
  /** Which series is visually emphasised (the EU page emphasises the EU series). */
  emphasise?: "a" | "b";
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const mobile = useIsMobile();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { eu: `${uid}-eu`, none: `${uid}-none` };
  const getTarget = useCallback(() => target, [target]);
  const { setActive, onKeyDown, openRow } = useChartSource<PairedRow>(getTarget);
  const rowH = mobile ? 58 : 44;
  const height = rows.length * rowH + 32;
  const labelW = mobile ? 0 : Math.min(Math.round(width * 0.3), 200);
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]));

  const Name = (p: { x?: number | string; y?: number | string; payload?: { index: number } }) => {
    const r = rows[p.payload?.index ?? 0];
    if (!r) return <g />;
    if (mobile) {
      return (
        <text x={4} y={Number(p.y ?? 0) - rowH / 2 + 12} fontSize={12} fontWeight={500} fill="var(--ink)">
          {r.label}
        </text>
      );
    }
    return (
      <text x={Number(p.x ?? 0)} y={Number(p.y ?? 0)} dy={4} textAnchor="end" fontSize={13} fontWeight={500} fill="var(--ink)">
        {r.label}
      </text>
    );
  };
  const pctLabel = (key: "a" | "b") =>
    function PctLabel(p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) {
      const r = rows[p.index ?? 0];
      if (!r) return null;
      const x = Number(p.x ?? 0) + Number(p.width ?? 0);
      const y = Number(p.y ?? 0) + Number(p.height ?? 0) / 2;
      return (
        <text x={x + 4} y={y} dy={4} fontSize={11} fontWeight={key === emphasise ? 600 : 400} fill={key === "a" ? "var(--portal-mk)" : "var(--portal-eu)"}>
          {fmtPct(r[key], 1)}
        </text>
      );
    };

  return (
    <>
      <Legend items={series.map((s) => ({ key: s.key, label: s.label, colorKey: s.colorKey }))} />
      <ChartFrame height={height} onKeyDown={onKeyDown} widthRef={ref}>
        {width > 0 ? (
          <BarChart
            width={width}
            height={height}
            data={rows}
            layout="vertical"
            margin={{ top: mobile ? 16 : 4, right: 44, bottom: 4, left: mobile ? 4 : 0 }}
            barCategoryGap={mobile ? 14 : 6}
            barGap={2}
            title={title}
            desc={KEY_HINT}
          >
            <Patterns ids={ids} />
            <CartesianGrid horizontal={false} stroke="var(--rule)" />
            <XAxis type="number" domain={[0, Math.ceil(max / 10) * 10]} tickFormatter={(v: number) => `${v} %`} tick={{ fontSize: 12, fill: "var(--ink-muted)" }} stroke="var(--rule)" />
            <YAxis type="category" dataKey="label" width={Math.max(labelW, 1)} tick={Name} tickLine={false} axisLine={false} interval={0} />
            <Tooltip
              cursor={{ fill: "var(--accent-soft)", fillOpacity: 0.5 }}
              isAnimationActive={false}
              content={(tp) => {
                const r = (tp.payload?.[0]?.payload as PairedRow | undefined) ?? null;
                return <TooltipBox<PairedRow> active={!!tp.active} row={r} onActive={setActive} title={r?.label} fields={r?.tooltip ?? []} />;
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                isAnimationActive={false}
                maxBarSize={14}
                fill={fillFor(s.colorKey, ids)}
                {...strokeFor(s.colorKey)}
                onClick={(d) => openRow(d.payload as PairedRow)}
                style={{ cursor: "pointer" }}
              >
                <LabelList dataKey={s.key} content={pctLabel(s.key)} />
              </Bar>
            ))}
          </BarChart>
        ) : null}
      </ChartFrame>
    </>
  );
}
