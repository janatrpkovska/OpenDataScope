"use client";
// One or more 100 % bars with labelled segments (C2, C6, C7, C8, C10).
// Each segment is drawn from counts; its share is computed here from the counts, never typed. Light segments
// carry a 1 px outline so they meet 3 : 1 against the card. Counts are printed inside segments wide enough.
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback, useId } from "react";
import type { ShareRow, ShareSegment, SourceTarget } from "@/data/types";
import { fmtInt, fmtShare } from "@/data/format";
import { ChartFrame, KEY_HINT, Legend, Patterns, TooltipBox, fillFor, strokeFor, useChartSource, useIsMobile, useWidth } from "./kit";

type Datum = ShareRow & Record<string, number | string | ShareSegment[]>;

export function ShareBar({
  rows,
  title,
  target,
  decimals = 1,
  unit,
  definition,
  boldKeys = ["mk"],
}: {
  rows: ShareRow[];
  title: string;
  target: SourceTarget | ((row: ShareRow) => SourceTarget);
  decimals?: 1 | 2;
  /** Plural unit of the counts, e.g. "datasets", "resources", "organisations". */
  unit: string | ((row: ShareRow) => string);
  definition?: string;
  boldKeys?: string[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const mobile = useIsMobile();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { eu: `${uid}-eu`, none: `${uid}-none` };
  const getTarget = useCallback((r: ShareRow) => (typeof target === "function" ? target(r) : target), [target]);
  const { setActive, onKeyDown, openRow } = useChartSource<ShareRow>(getTarget);
  const unitOf = (r: ShareRow) => (typeof unit === "function" ? unit(r) : unit);

  // Names sit above the bars on phones and whenever the card is too narrow for a label column. Before the card
  // is measured (server render, first paint) the desktop layout is assumed, so a desktop page does not shift
  // after hydration (which would also move a deep-linked #anchor under the sticky header).
  const stacked = mobile || (width > 0 && width < 560);
  const multi = rows.length > 1;
  const showNames = multi || rows[0]?.label !== undefined;
  const rowH = stacked && showNames ? 58 : 44;
  const height = rows.length * rowH + (multi ? 8 : 4);
  const labelW = stacked || !showNames ? 0 : Math.min(Math.round(width * 0.28), 210);

  // segment order is the same in every row; data holds shares (0–100) per segment key
  const segKeys = Array.from(new Set(rows.flatMap((r) => r.segments.map((s) => s.key))));
  const data: Datum[] = rows.map((r) => {
    const d: Record<string, unknown> = { ...r };
    for (const s of r.segments) d[`s_${s.key}`] = (s.value / r.total) * 100;
    return d as Datum;
  });
  // One legend entry per segment style; a label used with two colours names its row (C8: MK and NL).
  const styled = rows.flatMap((r) => r.segments.map((s) => ({ s, row: r })));
  const colorsByLabel = new Map<string, Set<string>>();
  for (const { s } of styled) colorsByLabel.set(s.label, (colorsByLabel.get(s.label) ?? new Set()).add(s.colorKey));
  const legendItems = Array.from(new Map(styled.map((x) => [`${x.s.label}|${x.s.colorKey}`, x])).values()).map(({ s, row }) => ({
    key: `${s.label}|${s.colorKey}`,
    label: (colorsByLabel.get(s.label)?.size ?? 1) > 1 ? `${s.label} (${row.label})` : s.label,
    colorKey: s.colorKey,
    outlined: s.outlined,
  }));

  const Name = (p: { x?: number | string; y?: number | string; payload?: { index: number } }) => {
    const r = rows[p.payload?.index ?? 0];
    if (!r) return <g />;
    const bold = boldKeys.includes(r.key);
    if (stacked) {
      return (
        <text x={4} y={Number(p.y ?? 0) - rowH / 2 + 12} fontSize={12} fontWeight={bold ? 600 : 500} fill={bold ? "var(--portal-mk)" : "var(--ink)"}>
          {r.label}
        </text>
      );
    }
    return (
      <text x={Number(p.x ?? 0)} y={Number(p.y ?? 0)} dy={4} textAnchor="end" fontSize={13} fontWeight={bold ? 600 : 500} fill={bold ? "var(--portal-mk)" : "var(--ink)"}>
        {r.label}
      </text>
    );
  };

  const SegLabel = (segKey: string) =>
    function Lbl(p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) {
      const r = rows[p.index ?? 0];
      const s = r?.segments.find((x) => x.key === segKey);
      if (!r || !s) return null;
      const w = Number(p.width ?? 0);
      const text = `${fmtInt(s.value)} · ${s.shareLabel ?? fmtShare(s.value, r.total, decimals)}`;
      const short = fmtInt(s.value);
      const fits = w > text.length * 6.6 + 18;
      const fitsShort = w > short.length * 7 + 18;
      if (!fits && !fitsShort) return null;
      const label = fits ? text : short;
      const x0 = Number(p.x ?? 0) + 8;
      const yc = Number(p.y ?? 0) + Number(p.height ?? 0) / 2;
      // White text only on the accent fill (8.7 : 1); dark text on the light fill; on grey or violet fills the
      // text sits on a white chip so it keeps 4.5 : 1 whatever the fill.
      if (s.colorKey === "mk" || s.colorKey === "local" || s.colorKey === "light") {
        return (
          <text x={x0} y={yc} dy={4} fontSize={12} fontWeight={600} fill={s.colorKey === "light" ? "var(--ink)" : "#ffffff"} pointerEvents="none">
            {label}
          </text>
        );
      }
      const cw = label.length * 6.6 + 8;
      return (
        <g pointerEvents="none">
          <rect x={x0 - 4} y={yc - 9} width={cw} height={18} rx={3} fill="#ffffff" />
          <text x={x0} y={yc} dy={4} fontSize={12} fontWeight={600} fill="var(--ink)">
            {label}
          </text>
        </g>
      );
    };

  return (
    <>
      <Legend items={legendItems} />
      <ChartFrame height={height} onKeyDown={onKeyDown} widthRef={ref}>
        {width > 0 ? (
          <BarChart
            width={width}
            height={height}
            data={data}
            layout="vertical"
            stackOffset="none"
            margin={{ top: stacked && showNames ? 16 : 2, right: 4, bottom: 2, left: 0 }}
            barCategoryGap={stacked && showNames ? 14 : 8}
            title={title}
            desc={KEY_HINT}
          >
            <Patterns ids={ids} />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" width={Math.max(labelW, 1)} tick={Name} tickLine={false} axisLine={false} interval={0} hide={!showNames} />
            <Tooltip
              cursor={{ fill: "var(--accent-soft)", fillOpacity: 0.5 }}
              isAnimationActive={false}
              content={(tp) => {
                const r = (tp.payload?.[0]?.payload as ShareRow | undefined) ?? null;
                return (
                  <TooltipBox<ShareRow>
                    active={!!tp.active}
                    row={r}
                    onActive={setActive}
                    title={r?.label}
                    fields={
                      r
                        ? [
                            ...r.segments.map((s) => ({
                              label: s.label,
                              value:
                                decimals === 2
                                  ? (s.fraction ?? `${fmtInt(s.value)} / ${fmtInt(r.total)} = ${fmtShare(s.value, r.total, 2)}`)
                                  : `${fmtInt(s.value)} ${unitOf(r)} (${s.shareLabel ?? fmtShare(s.value, r.total, 1)})`,
                            })),
                            { label: "Total", value: `${fmtInt(r.total)} ${unitOf(r)}` },
                            ...(definition ? [{ label: "Definition", value: definition }] : []),
                          ]
                        : []
                    }
                  />
                );
              }}
            />
            {segKeys.map((k) => (
              <Bar key={k} dataKey={`s_${k}`} stackId="share" isAnimationActive={false} maxBarSize={28} onClick={(d) => openRow(d.payload as ShareRow)} style={{ cursor: "pointer" }}
                shape={(sp: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
                  const r = rows[sp.index ?? 0];
                  const s = r?.segments.find((x) => x.key === k);
                  if (!s || !sp.width) return <g />;
                  return <rect x={sp.x} y={sp.y} width={Math.max(sp.width - 1, 0)} height={sp.height} fill={fillFor(s.colorKey, ids)} {...strokeFor(s.colorKey, s.outlined)} />;
                }}
                label={SegLabel(k)}
              />
            ))}
          </BarChart>
        ) : null}
      </ChartFrame>
    </>
  );
}
