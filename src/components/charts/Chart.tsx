"use client";
// One entry point for the 13 charts. Pages pass the build-time view model (serialisable); this
// component picks the approved chart type and its chart-specific settings. No chart holds a statistic of
// its own: every number comes from the model rows.
import { useState } from "react";
import type { ChartBundle, PortalId, ShareRow, SourceTarget } from "@/data/types";
import index from "@/data/generated/source-index.json";
import { fmtInt, fmtUtc } from "@/data/format";
import { MISSING, RULES } from "@/content/copy";
import { ChartCard } from "./ChartCard";
import { DotPlotLog, ScaleToggle, type Scale } from "./DotPlotLog";
import { RankedBarChart } from "./RankedBarChart";
import { PairedBarChart } from "./PairedBarChart";
import { ShareBar } from "./ShareBar";
import { PercentBars } from "./PercentBars";
import { Legend } from "./kit";
import { EmptyState } from "@/components/ui/Notes";

type Models = ChartBundle[keyof ChartBundle];
interface IndexMetric {
  countDefinition: string;
  extractionMethod: string;
  snapshotId: string;
  retrievedAtUtc: { start: string };
}
const METRICS = (index as unknown as { metrics: Record<string, IndexMetric> }).metrics;
/** The recorded count definition of a chart's input metric (Phase 1 metrics.csv), never re-worded here. */
const defOf = (t: SourceTarget): string | undefined => ("metricId" in t ? METRICS[t.metricId]?.countDefinition : undefined);

/** Provenance rows come from the data.europa.eu search facet (S1); North Macedonia's row has its own metric. */
const EU_PROVENANCE_SOURCE: SourceTarget = { sourceId: "S1-eu-search" };

const FORMAT_LEGEND = [
  { key: "open", label: "Open and machine-readable", colorKey: "fmt-open" },
  { key: "prop", label: "Machine-readable, proprietary", colorKey: "fmt-proprietary" },
  { key: "notmr", label: "Not machine-readable", colorKey: "fmt-not-mr" },
  { key: "none", label: "No format given", colorKey: "fmt-none" },
];
const PUBLISHER_LEGEND = [
  { key: "local", label: "Local government (project rule)", colorKey: "local" },
  { key: "central", label: "Central bodies and others", colorKey: "central" },
];

function SizeChart({ model, filterIds }: { model: ChartBundle["C1"]; filterIds?: PortalId[] }) {
  const [scale, setScale] = useState<Scale>("log");
  const rows = filterIds ? model.rows.filter((r) => filterIds.includes(r.portalId)) : model.rows;
  const annotation = scale === "log" ? model.annotation : "Linear scale: bar length is proportional to the count.";
  // The summary describes exactly the rows drawn (generated from the same values).
  const summary =
    `Catalogue size${scale === "log" ? " on a log scale" : ""}: ` +
    rows.map((r) => `${r.label} ${r.value === null ? MISSING[r.missingReason ?? "not_reliably_available"].label : `${fmtInt(r.value)} ${r.unitLabel}`}`).join("; ") +
    ".";
  if (filterIds && rows.length < 2) {
    return (
      <ChartCard
        model={{ ...model, annotation, summary: "No chart: fewer than two national portals are selected." }}
        empty
        emptyState={{ title: "Select at least two national portals.", body: "The size chart compares two to four national portals. The EU aggregator and Serbia are never drawn on this axis." }}
      >
        {null}
      </ChartCard>
    );
  }
  return (
    <ChartCard
      model={{ ...model, annotation, summary, table: filterIds ? { ...model.table, rows: model.table.rows.filter((_, i) => filterIds.includes(model.rows[i]!.portalId)) } : model.table }}
      controls={<ScaleToggle value={scale} onChange={setScale} />}
    >
      <DotPlotLog rows={rows} scale={scale} title={model.title} />
    </ChartCard>
  );
}

export function Chart({
  model,
  compact = false,
  filterIds,
  emphasiseEu = false,
}: {
  model: Models;
  /** Overview C3: compact height with all 13 rows. */
  compact?: boolean;
  /** Compare: C1 filtered to the selected national portals. */
  filterIds?: PortalId[];
  /** EU page: C4 with the EU series emphasised. */
  emphasiseEu?: boolean;
}) {
  switch (model.id) {
    case "C1":
      return <SizeChart model={model as ChartBundle["C1"]} filterIds={filterIds} />;
    case "C2": {
      const m = model as ChartBundle["C2"];
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <ShareBar rows={m.rows} title={m.title} target={m.sourceTarget} unit="datasets" definition={defOf(m.sourceTarget)} />
        </ChartCard>
      );
    }
    case "C6":
    case "C7": {
      const m = model as ChartBundle["C6"];
      const rule = m.projectIndicator === "open_format" ? RULES.open_format : RULES.machine_readable;
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <ShareBar rows={m.rows} title={m.title} target={m.sourceTarget} unit="resources" decimals={2} definition={rule} />
        </ChartCard>
      );
    }
    case "C8": {
      const m = model as ChartBundle["C8"];
      const target = (r: ShareRow): SourceTarget => ({ metricId: `${r.key}.datasets_open_licence_id` });
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <ShareBar rows={m.rows} title={m.title} target={target} unit={(r) => (r.key === "mk" ? "datasets" : "records")} definition={defOf(m.sourceTarget)} />
        </ChartCard>
      );
    }
    case "C10": {
      const m = model as ChartBundle["C10"];
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <ShareBar rows={m.rows} title={m.title} target={m.sourceTarget} unit="organisations" definition={defOf(m.sourceTarget)} boldKeys={[]} />
        </ChartCard>
      );
    }
    case "C3":
    case "C5":
    case "C11":
    case "C12":
    case "C13": {
      const m = model as ChartBundle["C3"];
      const legend = model.id === "C5" ? FORMAT_LEGEND : model.id === "C11" ? PUBLISHER_LEGEND : model.id === "C12"
        ? [
            { key: "mk", label: "North Macedonia", colorKey: "mk" },
            { key: "rs", label: "Serbia (regional context)", colorKey: "rs" },
            { key: "other", label: "Other non-EU European countries", colorKey: "national" },
          ]
        : model.id === "C13"
          ? [
              { key: "eu", label: "Records harvested by the EU aggregator", colorKey: "eu" },
              { key: "mk", label: "North Macedonia", colorKey: "mk" },
            ]
          : null;
      const all0 = m.rows.length === 0;
      return (
        <ChartCard model={m} empty={all0}>
          {legend ? <Legend items={legend} /> : null}
          <RankedBarChart
            rows={m.rows}
            title={m.title}
            fallbackTarget={model.id === "C12" || model.id === "C13" ? EU_PROVENANCE_SOURCE : m.sourceTarget} compact={compact && model.id === "C3"} boldKeys={model.id === "C11" ? [] : ["mk"]} />
        </ChartCard>
      );
    }
    case "C4": {
      const m = model as ChartBundle["C4"];
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <PairedBarChart rows={m.rows} series={m.series} title={m.title} target={m.sourceTarget} emphasise={emphasiseEu ? "b" : "a"} />
        </ChartCard>
      );
    }
    case "C9": {
      const m = model as ChartBundle["C9"];
      const details = (r: { metricIds: string[] }) => {
        const x = METRICS[r.metricIds[0]!];
        if (!x) return [];
        return [
          { label: "Query", value: `${x.countDefinition} (${x.extractionMethod})` },
          { label: "Layer and time", value: `${x.snapshotId} · ${fmtUtc(x.retrievedAtUtc.start)}` },
        ];
      };
      return (
        <ChartCard model={m} empty={m.rows.length === 0}>
          <PercentBars rows={m.rows} title={m.title} details={details} />
        </ChartCard>
      );
    }
    default:
      return <EmptyState title="Chart not available" body="This chart is not available." />;
  }
}
