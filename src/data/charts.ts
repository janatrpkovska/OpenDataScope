// Chart view models C1–C13, computed once at build time from validated data.
// Components only draw what is here: no chart computes a statistic of its own.
import { topWithTies, TOP_PUBLISHERS_N } from "./derive";
import { fmtDec, fmtFraction, fmtInt, fmtPct, fmtShare, fmtSigned, fmtUtc, round, share } from "./format";
import type {
  BarRow,
  ChartBundle,
  ChartModel,
  DerivedValue,
  EuProvenance,
  FormatClass,
  FormatMetric,
  Metric,
  PairedRow,
  PercentRow,
  Portal,
  PublisherMetric,
  ShareRow,
  SizeRow,
  SourceRecord,
  ThemeMetric,
  ThemeProfileRow,
  ValidationReading,
} from "./types";

export interface ChartInput {
  portals: Portal[];
  metrics: Record<string, Metric>;
  validation: ValidationReading[];
  sources: SourceRecord[];
  themes: ThemeMetric[];
  themeProfile: ThemeProfileRow[];
  formats: FormatMetric[];
  publishers: PublisherMetric[];
  euProvenance: EuProvenance[];
  derived: Record<string, DerivedValue>;
  text: Record<string, string>;
  snapshotLabel: string;
}

export const FORMAT_CLASS_LABEL: Record<FormatClass, string> = {
  open_machine_readable: "Open and machine-readable",
  machine_readable_proprietary: "Machine-readable, proprietary",
  not_machine_readable: "Not machine-readable",
  no_format: "No format given",
};

const FORMAT_CLASS_COLOR: Record<FormatClass, string> = {
  open_machine_readable: "fmt-open",
  machine_readable_proprietary: "fmt-proprietary",
  not_machine_readable: "fmt-not-mr",
  no_format: "fmt-none",
};

function n(metrics: Record<string, Metric>, id: string): number {
  const m = metrics[id];
  if (!m || typeof m.value !== "number") throw new Error(`charts: metric ${id} missing or not numeric`);
  return m.value;
}

function t(text: Record<string, string>, key: string): string {
  const v = text[key];
  if (v === undefined) throw new Error(`charts: copy ${key} missing`);
  return v;
}

/** "S2 · 2026-10-08 23:03:33 UTC" or "R1 · 2026-10-08 22:32:14–22:34:30 UTC" */
export function layerTime(m: Metric): string {
  const start = fmtUtc(m.retrievedAtUtc.start);
  if (!m.retrievedAtUtc.end) return `${m.snapshotId} · ${start}`;
  return `${m.snapshotId} · ${start.replace(" UTC", "")}–${m.retrievedAtUtc.end.slice(11, 19)} UTC`;
}

function sourceLine(sources: SourceRecord[], m: Metric): string {
  const s = sources.find((x) => x.id === m.sourceId);
  const issuer = s ? s.issuer : m.sourceUrl;
  const t0 = m.retrievedAtUtc.start;
  return `Source: ${issuer}, ${m.snapshotId}, ${t0.slice(0, 10)} ${t0.slice(11, 16)} UTC`;
}

/** One source line for several metrics from different portals or layers (C9: MK and UK S1, NL S2). */
function sourcesLine(sources: SourceRecord[], ms: Metric[]): string {
  const parts = ms.map((m) => sourceLine(sources, m).replace(/^Source: /, ""));
  return `Sources: ${Array.from(new Set(parts)).join("; ")}`;
}

/** Source line read from a source record (C11: the per-publisher counts come from the S2 crawl). */
function sourceRecordLine(sources: SourceRecord[], id: string): string {
  const s = sources.find((x) => x.id === id);
  if (!s || !s.retrievedAt) throw new Error(`charts: source ${id} missing or undated`);
  return `Source: ${s.issuer}, ${s.layer}, ${s.retrievedAt.slice(0, 10)} ${s.retrievedAt.slice(11, 16)} UTC`;
}

/** The most relevant later validation reading for a canonical metric (V first, then earlier). */
export function validationFor(validation: ValidationReading[], metricId: string): ValidationReading | null {
  const rows = validation.filter((v) => v.canonicalMetricId === metricId && v.visibleNumber !== null);
  return rows.find((v) => v.layer === "V") ?? rows[0] ?? null;
}

export function validationText(v: ValidationReading): string {
  const when = v.layer === "V" ? "later validation reading, 9 Oct 2026" : "earlier reading";
  if (v.difference === 0) return `${fmtInt(v.visibleNumber as number)} (${when}; no difference)`;
  const diff = v.difference !== null ? fmtSigned(v.difference) : "";
  const pct = v.differencePct !== null ? ` (${fmtSigned(v.differencePct, 3)}${" "}%)` : "";
  return `${fmtInt(v.visibleNumber as number)} (${when}; ${diff}${pct})`;
}

function base(id: ChartModel["id"], fields: Omit<ChartModel, "id">): ChartModel {
  return { id, ...fields };
}

export function buildCharts(input: ChartInput): ChartBundle {
  const { portals, metrics, validation, sources, themes, themeProfile, formats, publishers, euProvenance, derived, text } = input;
  const mkDatasets = n(metrics, "mk.datasets_total");
  const mkResources = n(metrics, "mk.resources_total");

  // ---------- C1 national catalogue size ----------
  const national = portals.filter((p) => p.portalClass === "national");
  const sizeRows: SizeRow[] = national
    .map((p) => {
      const m = metrics[p.headlineMetricId]!;
      const v = validationFor(validation, m.id);
      return {
        portalId: p.id,
        label: p.country,
        value: typeof m.value === "number" ? m.value : null,
        missingReason: typeof m.value === "number" ? null : (m.missingReason ?? "not_reliably_available"),
        unitLabel: p.unitLabel,
        metricId: m.id,
        definition: m.countDefinition,
        layerTime: layerTime(m),
        comparabilityNote: m.comparabilityNote || p.unitNote,
        validation: v ? validationText(v) : null,
        isReference: p.isReference,
      };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const C1 = {
    ...base("C1", {
      title: t(text, "C1_title"),
      subtitle: "Canonical catalogue size per national portal · research snapshot · the unit is printed on every row",
      status: "partial",
      statusNote: "Units differ: dataset, directory record, metadata record, register record.",
      projectIndicator: null,
      annotation: "Log scale: each gridline is 10 × the previous one",
      note: null,
      sourceLine: `Sources: official portal APIs and page readings, S1, S2, R1, ${input.snapshotLabel.replace("Research snapshot: ", "")}`,
      sourceTarget: { metricId: "mk.datasets_total" },
      summary:
        "Catalogue size on a log scale: " +
        sizeRows.map((r) => `${r.label} ${r.value === null ? "not reliably available" : fmtInt(r.value)} ${r.unitLabel}`).join("; ") +
        ".",
      table: {
        caption: "National catalogue size, research snapshot",
        columns: [
          { key: "portal", header: "Portal" },
          { key: "count", header: "Canonical count", align: "right" },
          { key: "unit", header: "Unit" },
          { key: "definition", header: "Count definition" },
          { key: "layer", header: "Layer and time" },
          { key: "validation", header: "Later reading (validation)" },
        ],
        rows: sizeRows.map((r) => ({
          portal: r.label,
          count: r.value === null ? "Not reliably available" : fmtInt(r.value),
          unit: r.unitLabel,
          definition: r.definition,
          layer: r.layerTime,
          validation: r.validation ?? "None registered",
        })),
      },
      metricIds: sizeRows.map((r) => r.metricId),
    }),
    rows: sizeRows,
  } as ChartBundle["C1"];

  // ---------- C2 theme coverage ----------
  const withTheme = n(metrics, "mk.datasets_with_theme");
  const noTheme = derived["mk.datasets_without_theme"]!.value;
  const C2 = {
    ...base("C2", {
      title: t(text, "C2_title"),
      subtitle: t(text, "C2_subtitle"),
      status: null,
      statusNote: null,
      projectIndicator: null,
      annotation: null,
      note: null,
      sourceLine: sourceLine(sources, metrics["mk.datasets_with_theme"]!),
      sourceTarget: { metricId: "mk.datasets_with_theme" },
      summary: `${fmtInt(withTheme)} of ${fmtInt(mkDatasets)} datasets (${fmtShare(withTheme, mkDatasets)}) carry at least one theme; ${fmtInt(noTheme)} (${fmtShare(noTheme, mkDatasets)}) carry none.`,
      table: {
        caption: "North Macedonian datasets by theme coverage",
        columns: [
          { key: "segment", header: "Segment" },
          { key: "datasets", header: "Datasets", align: "right" },
          { key: "share", header: "Share of datasets", align: "right" },
        ],
        rows: [
          { segment: "With a theme", datasets: fmtInt(withTheme), share: fmtShare(withTheme, mkDatasets) },
          { segment: "No theme", datasets: fmtInt(noTheme), share: fmtShare(noTheme, mkDatasets) },
        ],
      },
      metricIds: ["mk.datasets_with_theme", "mk.datasets_total"],
    }),
    rows: [
      {
        key: "mk",
        label: "North Macedonia",
        total: mkDatasets,
        segments: [
          { key: "with", label: "With a theme", value: withTheme, colorKey: "mk" },
          { key: "none", label: "No theme", value: noTheme, colorKey: "light", outlined: true },
        ],
      },
    ],
  } as ChartBundle["C2"];

  // ---------- C3 theme assignments ----------
  const themeRows: BarRow[] = themes
    .filter((x) => x.code !== "NONE")
    .sort((a, b) => b.datasets - a.datasets)
    .map((x) => ({
      key: x.code,
      label: x.shortLabel,
      secondaryLabel: x.code,
      value: x.datasets,
      share: x.shareOfDatasetsPct,
      colorKey: "mk",
      valueLabel: `${fmtInt(x.datasets)} · ${fmtPct(x.shareOfDatasetsPct)}`,
      tooltip: [
        { label: "Code", value: x.code },
        { label: "Theme", value: x.name },
        { label: "Datasets", value: fmtInt(x.datasets) },
        { label: "Share of datasets", value: fmtPct(x.shareOfDatasetsPct) },
      ],
    }));
  const C3 = {
    ...base("C3", {
      title: t(text, "C3_title"),
      subtitle: t(text, "C3_subtitle"),
      status: null,
      statusNote: null,
      projectIndicator: null,
      annotation: null,
      note: t(text, "C3_note"),
      sourceLine: sourceLine(sources, metrics["mk.theme_assignments"]!),
      sourceTarget: { metricId: "mk.theme_assignments" },
      summary: "Datasets per theme: " + themeRows.map((r) => `${r.label} ${fmtInt(r.value)} (${fmtPct(r.share as number)})`).join(", ") + ". Themes overlap.",
      table: {
        caption: "North Macedonian datasets per EU data-theme code (overlapping)",
        columns: [
          { key: "code", header: "Code" },
          { key: "theme", header: "Theme" },
          { key: "datasets", header: "Datasets", align: "right" },
          { key: "share", header: "Share of datasets", align: "right" },
        ],
        rows: themes
          .filter((x) => x.code !== "NONE")
          .sort((a, b) => b.datasets - a.datasets)
          .map((x) => ({ code: x.code, theme: x.name, datasets: fmtInt(x.datasets), share: fmtPct(x.shareOfDatasetsPct) })),
      },
      metricIds: ["mk.theme_assignments", "mk.datasets_with_theme"],
    }),
    rows: themeRows,
  } as ChartBundle["C3"];

  // ---------- C4 MK vs EU-portal profile ----------
  const profile = [...themeProfile].sort((a, b) => b.mkPctOfAssignments - a.mkPctOfAssignments);
  const pairedRows: PairedRow[] = profile.map((r) => ({
    key: r.code,
    label: r.shortLabel,
    a: r.mkPctOfAssignments,
    b: r.euPctOfAssignments,
    tooltip: [
      { label: "Theme", value: `${r.name} (${r.code})` },
      { label: "North Macedonia", value: `${fmtInt(r.mkDatasets)} tags · ${fmtPct(r.mkPctOfAssignments)} of tags` },
      { label: "EU portal", value: `${fmtInt(r.euRecords)} records · ${fmtPct(r.euPctOfAssignments)} of assignments` },
      { label: "MK-to-EU ratio", value: fmtDec(r.mkToEuRatio, 2) },
    ],
  }));
  const C4 = {
    ...base("C4", {
      title: t(text, "C4_title"),
      subtitle: "Share of theme assignments: North Macedonia (S2 crawl) and the EU-portal profile (S1)",
      status: "partial",
      statusNote: "Same vocabulary, but the EU profile counts aggregated records dominated by one country.",
      projectIndicator: null,
      annotation: t(text, "C4_annotation"),
      note: null,
      sourceLine: sourceLine(sources, metrics["eu.theme_assignments"]!),
      sourceTarget: { metricId: "eu.theme_assignments" },
      summary:
        "Share of theme tags, North Macedonia versus EU portal: " +
        profile.map((r) => `${r.shortLabel} ${fmtPct(r.mkPctOfAssignments)} vs ${fmtPct(r.euPctOfAssignments)}`).join("; ") +
        ".",
      table: {
        caption: "Theme profile: North Macedonia vs EU portal (share of assignments)",
        columns: [
          { key: "theme", header: "Theme" },
          { key: "mk", header: "North Macedonia, % of tags", align: "right" },
          { key: "eu", header: "EU portal, % of assignments", align: "right" },
          { key: "ratio", header: "MK-to-EU ratio", align: "right" },
        ],
        rows: profile.map((r) => ({ theme: `${r.name} (${r.code})`, mk: fmtPct(r.mkPctOfAssignments), eu: fmtPct(r.euPctOfAssignments), ratio: fmtDec(r.mkToEuRatio, 2) })),
      },
      metricIds: ["mk.theme_assignments", "eu.theme_assignments"],
    }),
    rows: pairedRows,
    series: [
      { key: "a", label: "North Macedonia", colorKey: "mk" },
      { key: "b", label: "EU portal (reference)", colorKey: "eu" },
    ],
  } as ChartBundle["C4"];

  // ---------- C5 resource formats ----------
  const formatRows: BarRow[] = formats.map((f) => ({
    key: f.format,
    label: f.label,
    value: f.resourceCount,
    share: f.shareOfResourcesPct,
    colorKey: FORMAT_CLASS_COLOR[f.formatClass],
    valueLabel: `${fmtInt(f.resourceCount)} · ${fmtShare(f.resourceCount, mkResources)}`,
    tooltip: [
      { label: "Format", value: f.label },
      { label: "Resources", value: fmtInt(f.resourceCount) },
      { label: "Share of resources", value: fmtPct(f.shareOfResourcesPct, 2) },
      { label: "Datasets offering it", value: fmtInt(f.datasetsOffering) },
      { label: "Share of datasets", value: fmtPct(f.shareOfDatasetsPct) },
      { label: "Class (project rule)", value: FORMAT_CLASS_LABEL[f.formatClass] },
      { label: "Raw labels mapped", value: f.rawLabels.map((r) => `${r.raw} (${fmtInt(r.count)})`).join(", ") },
    ],
  }));
  const C5 = {
    ...base("C5", {
      title: t(text, "C5_title"),
      subtitle: t(text, "C5_subtitle"),
      status: null,
      statusNote: null,
      projectIndicator: "machine_readable",
      annotation: null,
      note: "Format classes follow the project rule; see Methodology, format normalisation.",
      sourceLine: sourceLine(sources, metrics["mk.resources_total"]!),
      sourceTarget: { metricId: "mk.resources_total" },
      summary: "Resources by format: " + formatRows.map((r) => `${r.label} ${fmtInt(r.value)} (${fmtShare(r.value, mkResources)})`).join(", ") + ".",
      table: {
        caption: "data.gov.mk resources by normalised format",
        columns: [
          { key: "format", header: "Format" },
          { key: "resources", header: "Resources", align: "right" },
          { key: "share", header: "Share of resources", align: "right" },
          { key: "datasets", header: "Datasets offering it", align: "right" },
          { key: "dshare", header: "Share of datasets", align: "right" },
          { key: "class", header: "Class (project rule)" },
        ],
        rows: formats.map((f) => ({
          format: f.label,
          resources: fmtInt(f.resourceCount),
          share: fmtPct(f.shareOfResourcesPct, 2),
          datasets: fmtInt(f.datasetsOffering),
          dshare: fmtPct(f.shareOfDatasetsPct),
          class: FORMAT_CLASS_LABEL[f.formatClass],
        })),
      },
      metricIds: ["mk.resources_total"],
    }),
    rows: formatRows,
  } as ChartBundle["C5"];

  // ---------- C6 / C7 project-defined indicators ----------
  const indicator = (
    id: "C6" | "C7",
    metricId: string,
    yesLabel: string,
    noLabel: string,
    noDerived: string,
    rule: "machine_readable" | "open_format",
  ) => {
    const yes = n(metrics, metricId);
    const no = derived[noDerived]!.value;
    return {
      ...base(id, {
        title: t(text, `${id}_title`),
        subtitle: t(text, `${id}_subtitle`),
        status: null,
        statusNote: "Not an official rating or quality score.",
        projectIndicator: rule,
        annotation: null,
        note: null,
        sourceLine: sourceLine(sources, metrics[metricId]!),
        sourceTarget: { metricId },
        summary: `${yesLabel}: ${fmtFraction(yes, mkResources)}. ${noLabel}: ${fmtInt(no)}. Project-defined indicator.`,
        table: {
          caption: `${yesLabel} resources (project rule)`,
          columns: [
            { key: "segment", header: "Segment" },
            { key: "resources", header: "Resources", align: "right" },
            { key: "share", header: "Share of resources", align: "right" },
          ],
          rows: [
            { segment: yesLabel, resources: fmtInt(yes), share: fmtShare(yes, mkResources, 2) },
            { segment: noLabel, resources: fmtInt(no), share: fmtShare(no, mkResources, 2) },
          ],
        },
        metricIds: [metricId, "mk.resources_total"],
      }),
      rows: [
        {
          key: "mk",
          label: "Resources",
          total: mkResources,
          segments: [
            { key: "yes", label: yesLabel, value: yes, colorKey: "mk" },
            { key: "no", label: noLabel, value: no, colorKey: "light", outlined: true },
          ],
        },
      ],
    } as ChartBundle["C6"];
  };
  const C6 = indicator("C6", "mk.machine_readable_resources", "Machine-readable", "Not machine-readable", "mk.not_machine_readable", "machine_readable");
  const C7 = indicator("C7", "mk.open_format_resources", "Open format", "Other formats", "mk.not_open_format", "open_format");

  // ---------- C8 licence identifiers ----------
  const mkOpen = n(metrics, "mk.datasets_open_licence_id");
  const mkNs = n(metrics, "mk.datasets_licence_not_specified");
  const mkNone = n(metrics, "mk.datasets_no_licence_id");
  const nlTotal = n(metrics, "nl.datasets_total");
  const nlOpen = n(metrics, "nl.datasets_open_licence_id");
  const nlOther = derived["nl.other_licence"]!.value;
  const C8 = {
    ...base("C8", {
      title: t(text, "C8_title"),
      subtitle: "Share of each portal's own records by licence identifier · MK S1, NL S2",
      status: "direct",
      statusNote: "Same CKAN license_id field in both portals.",
      projectIndicator: null,
      annotation: t(text, "licenceBreakdown"),
      note: "The Dutch register also contains non-public records.",
      sourceLine: sourcesLine(sources, [metrics["mk.datasets_open_licence_id"]!, metrics["nl.datasets_open_licence_id"]!]),
      sourceTarget: { metricId: "mk.datasets_open_licence_id" },
      summary: `North Macedonia: open-licence id ${fmtInt(mkOpen)} (${fmtShare(mkOpen, mkDatasets)}), not specified ${fmtInt(mkNs)} (${fmtShare(mkNs, mkDatasets)}), no licence id ${fmtInt(mkNone)} (${fmtShare(mkNone, mkDatasets)}). Netherlands: open-licence id ${fmtInt(nlOpen)} (${fmtShare(nlOpen, nlTotal)}), other or none ${fmtInt(nlOther)} (${fmtShare(nlOther, nlTotal)}).`,
      table: {
        caption: "Licence identifiers: North Macedonia and the Netherlands",
        columns: [
          { key: "portal", header: "Portal" },
          { key: "segment", header: "Licence identifier" },
          { key: "records", header: "Records", align: "right" },
          { key: "share", header: "Share of own records", align: "right" },
        ],
        rows: [
          { portal: "North Macedonia", segment: "Open-licence identifier", records: fmtInt(mkOpen), share: fmtShare(mkOpen, mkDatasets) },
          { portal: "North Macedonia", segment: "Licence \"not specified\"", records: fmtInt(mkNs), share: fmtShare(mkNs, mkDatasets) },
          { portal: "North Macedonia", segment: "No licence identifier", records: fmtInt(mkNone), share: fmtShare(mkNone, mkDatasets) },
          { portal: "Netherlands", segment: "Open-licence identifier", records: fmtInt(nlOpen), share: fmtShare(nlOpen, nlTotal) },
          { portal: "Netherlands", segment: "Other or none", records: fmtInt(nlOther), share: fmtShare(nlOther, nlTotal) },
        ],
      },
      metricIds: ["mk.datasets_open_licence_id", "mk.datasets_licence_not_specified", "mk.datasets_no_licence_id", "nl.datasets_open_licence_id", "nl.datasets_total"],
    }),
    rows: [
      {
        key: "mk",
        label: "North Macedonia",
        total: mkDatasets,
        segments: [
          { key: "open", label: "Open-licence identifier", value: mkOpen, colorKey: "mk" },
          { key: "ns", label: "Licence \"not specified\"", value: mkNs, colorKey: "mid" },
          { key: "none", label: "No licence identifier", value: mkNone, colorKey: "light", outlined: true },
        ],
      },
      {
        key: "nl",
        label: "Netherlands",
        total: nlTotal,
        segments: [
          { key: "open", label: "Open-licence identifier", value: nlOpen, colorKey: "national" },
          { key: "other", label: "Other or none", value: nlOther, colorKey: "light", outlined: true },
        ],
      },
    ],
  } as ChartBundle["C8"];

  // ---------- C9 metadata activity ----------
  const activityRows: PercentRow[] = (["mk", "uk", "nl"] as const).map((p) => {
    const num = n(metrics, `${p}.records_metadata_modified_12m`);
    const den = n(metrics, `${p}.datasets_total`);
    return {
      portalId: p,
      label: portals.find((x) => x.id === p)!.country,
      numerator: num,
      denominator: den,
      metricIds: [`${p}.records_metadata_modified_12m`, `${p}.datasets_total`],
      pct: round(share(num, den), 2),
    };
  });
  const C9 = {
    ...base("C9", {
      title: "Metadata records modified in the last 12 months",
      subtitle: t(text, "metadataActivitySubtitle"),
      status: "direct",
      statusNote: "Same CKAN query on all three portals; S1 and S2 about 42 minutes apart.",
      projectIndicator: null,
      annotation: null,
      note: "metadata_modified reflects catalogue metadata activity and does not necessarily mean the underlying dataset itself changed.",
      sourceLine: sourcesLine(sources, (["mk", "uk", "nl"] as const).map((p) => metrics[`${p}.records_metadata_modified_12m`]!)),
      sourceTarget: { metricId: "mk.records_metadata_modified_12m" },
      summary: "Share of own records with metadata modified in 12 months: " + activityRows.map((r) => `${r.label} ${fmtFraction(r.numerator, r.denominator)}`).join("; ") + ".",
      table: {
        caption: "Metadata records modified in the last 12 months (share of own records)",
        columns: [
          { key: "portal", header: "Portal" },
          { key: "modified", header: "Modified in 12 months", align: "right" },
          { key: "total", header: "Records", align: "right" },
          { key: "share", header: "Share", align: "right" },
        ],
        rows: activityRows.map((r) => ({ portal: r.label, modified: fmtInt(r.numerator), total: fmtInt(r.denominator), share: fmtShare(r.numerator, r.denominator, 2) })),
      },
      metricIds: activityRows.flatMap((r) => r.metricIds),
    }),
    rows: activityRows,
  } as ChartBundle["C9"];

  // ---------- C10 publisher participation ----------
  const listed = n(metrics, "mk.organisations_listed");
  const active = n(metrics, "mk.publishers_active");
  const localListed = derived["mk.local_gov_listed"]!.value;
  const localActive = n(metrics, "mk.active_local_government_publishers");
  const otherListed = derived["mk.other_listed"]!.value;
  const otherActive = derived["mk.other_active"]!.value;
  const PUB = "Published at least one public dataset";
  const NOPUB = "No public dataset in the snapshot";
  const partRows: ShareRow[] = [
    { key: "all", label: `All listed (${fmtInt(listed)})`, total: listed, segments: [{ key: "pub", label: PUB, value: active, colorKey: "mk" }, { key: "nopub", label: NOPUB, value: listed - active, colorKey: "light", outlined: true }] },
    { key: "local", label: `Local government (${fmtInt(localListed)})`, total: localListed, segments: [{ key: "pub", label: PUB, value: localActive, colorKey: "mk" }, { key: "nopub", label: NOPUB, value: localListed - localActive, colorKey: "light", outlined: true }] },
    { key: "other", label: `Central bodies and others (${fmtInt(otherListed)})`, total: otherListed, segments: [{ key: "pub", label: PUB, value: otherActive, colorKey: "mk" }, { key: "nopub", label: NOPUB, value: otherListed - otherActive, colorKey: "light", outlined: true }] },
  ];
  const C10 = {
    ...base("C10", {
      title: t(text, "C10_title"),
      subtitle: "Listed organisations by publishing status · S2",
      status: null,
      statusNote: null,
      projectIndicator: "local_government",
      annotation: null,
      note: "Listed organisations are not the same as active publishers.",
      sourceLine: sourceLine(sources, metrics["mk.organisations_listed"]!),
      sourceTarget: { metricId: "mk.organisations_listed" },
      summary: partRows.map((r) => `${r.label}: ${fmtInt(r.segments[0]!.value)} published (${fmtShare(r.segments[0]!.value, r.total)}), ${fmtInt(r.segments[1]!.value)} did not`).join("; ") + ".",
      table: {
        caption: "Listed organisations by publishing status",
        columns: [
          { key: "group", header: "Group" },
          { key: "pub", header: PUB, align: "right" },
          { key: "nopub", header: NOPUB, align: "right" },
          { key: "share", header: "Share publishing", align: "right" },
        ],
        rows: partRows.map((r) => ({ group: r.label, pub: fmtInt(r.segments[0]!.value), nopub: fmtInt(r.segments[1]!.value), share: fmtShare(r.segments[0]!.value, r.total) })),
      },
      metricIds: ["mk.organisations_listed", "mk.publishers_active", "mk.active_local_government_publishers"],
    }),
    rows: partRows,
  } as ChartBundle["C10"];

  // ---------- C11 top publishers ----------
  const activePubs = publishers.filter((p) => p.active);
  const top = topWithTies(activePubs, (p) => p.datasets, TOP_PUBLISHERS_N);
  const pubRows: BarRow[] = top.map((p) => ({
    key: p.orgName,
    label: p.titleEn ?? p.titleOriginal,
    secondaryLabel: p.titleOriginal,
    value: p.datasets,
    share: p.sharePct,
    colorKey: p.localGovernment ? "local" : "central",
    valueLabel: `${fmtInt(p.datasets)} · ${fmtPct(p.sharePct)}`,
    tooltip: [
      { label: "Publisher", value: p.titleEn ?? p.titleOriginal },
      { label: "Original title (Macedonian)", value: p.titleOriginal },
      { label: "Type", value: p.localGovernment ? "Local government (title-prefix rule)" : "Central body or other" },
      { label: "Datasets", value: fmtInt(p.datasets) },
      { label: "Share of datasets", value: fmtPct(p.sharePct) },
      { label: "Rank", value: String(p.rank) },
    ],
  }));
  const C11 = {
    ...base("C11", {
      title: t(text, "C11_title"),
      subtitle: `Datasets per active publisher, top ${TOP_PUBLISHERS_N} with ties kept · S2`,
      status: null,
      statusNote: null,
      projectIndicator: "local_government",
      annotation: t(text, "C11_annotation"),
      note: null,
      sourceLine: sourceRecordLine(sources, "S2-mk-crawl"),
      sourceTarget: { sourceId: "S2-mk-crawl" },
      summary: "Datasets per publisher: " + pubRows.map((r) => `${r.label} ${fmtInt(r.value)}`).join(", ") + ".",
      table: {
        caption: `Top ${TOP_PUBLISHERS_N} active publishers (ties kept)`,
        columns: [
          { key: "rank", header: "Rank", align: "right" },
          { key: "publisher", header: "Publisher", primary: true },
          { key: "original", header: "Original title", lang: "mk" },
          { key: "type", header: "Type" },
          { key: "datasets", header: "Datasets", align: "right" },
          { key: "share", header: "Share", align: "right" },
        ],
        rows: top.map((p) => ({
          rank: p.rank,
          publisher: p.titleEn ?? p.titleOriginal,
          original: p.titleOriginal,
          type: p.localGovernment ? "Local government" : "Central body or other",
          datasets: fmtInt(p.datasets),
          share: fmtPct(p.sharePct),
        })),
      },
      metricIds: ["mk.publishers_active", "mk.datasets_total"],
    }),
    rows: pubRows,
  } as ChartBundle["C11"];

  // ---------- C12 EU discoverability (regional) ----------
  const prov = (code: string) => {
    const r = euProvenance.find((p) => p.countryCode === code);
    if (!r) throw new Error(`charts: provenance ${code} missing`);
    return r;
  };
  const regional = ["rs", "me", "al", "mk"].map(prov).sort((a, b) => b.records - a.records);
  const regRows: BarRow[] = regional.map((r) => ({
    key: r.countryCode,
    label: r.label,
    value: r.records,
    share: null,
    colorKey: r.countryCode === "mk" ? "mk" : r.countryCode === "rs" ? "rs" : "national",
    ...(r.countryCode === "mk" ? { metricId: "mk.records_on_data_europa_eu" } : {}),
    valueLabel: r.records === 0 ? "0: absent from the complete provenance facet" : fmtInt(r.records),
    tooltip: [
      { label: "Country", value: r.label },
      { label: "Records on data.europa.eu", value: fmtInt(r.records) },
      { label: "Facet", value: "country (provenance), S1 2026-10-08 22:22:33 UTC" },
    ],
  }));
  const C12 = {
    ...base("C12", {
      title: "North Macedonia had no records on data.europa.eu; Serbia, Montenegro and Albania did",
      subtitle: "Records on data.europa.eu by provenance, selected non-EU European countries · S1",
      status: "direct",
      statusNote: "Same provenance facet for every country.",
      projectIndicator: null,
      annotation: null,
      note: "Countries are shown only where the snapshot's provenance facet lists them; North Macedonia's 0 is recorded because the complete facet does not list it.",
      sourceLine: sourceLine(sources, metrics["mk.records_on_data_europa_eu"]!),
      sourceTarget: { metricId: "mk.records_on_data_europa_eu" },
      summary: "Records on data.europa.eu: " + regRows.map((r) => `${r.label} ${fmtInt(r.value)}`).join(", ") + ".",
      table: {
        caption: "Records on data.europa.eu by provenance (selected countries)",
        columns: [
          { key: "country", header: "Country" },
          { key: "records", header: "Records", align: "right" },
        ],
        rows: regional.map((r) => ({ country: r.label, records: r.records === 0 ? "0: absent from the complete provenance facet" : fmtInt(r.records) })),
      },
      metricIds: ["mk.records_on_data_europa_eu"],
    }),
    rows: regRows,
  } as ChartBundle["C12"];

  // ---------- C13 EU provenance ----------
  const euTotal = n(metrics, "eu.datasets_total");
  const top12 = [...euProvenance].filter((p) => p.countryCode !== "mk").sort((a, b) => b.records - a.records).slice(0, 12);
  const provRows = [...top12, prov("mk")];
  const provBars: BarRow[] = provRows.map((r) => ({
    key: r.countryCode,
    label: r.label,
    value: r.records,
    share: r.records > 0 ? round(share(r.records, euTotal), 1) : null,
    colorKey: r.countryCode === "mk" ? "mk" : "eu",
    ...(r.countryCode === "mk" ? { metricId: "mk.records_on_data_europa_eu" } : {}),
    valueLabel: r.records === 0 ? "0: absent from the complete provenance facet" : `${fmtInt(r.records)} · ${fmtShare(r.records, euTotal)}`,
    tooltip: [
      { label: "Provenance value", value: r.label },
      { label: "Records", value: fmtInt(r.records) },
      { label: "Share of the EU total", value: fmtShare(r.records, euTotal) },
    ],
  }));
  const C13 = {
    ...base("C13", {
      title: t(text, "C13_title"),
      subtitle: "Records on data.europa.eu by provenance value, top 12 plus North Macedonia · S1",
      status: "context_only",
      statusNote: "Composition of an aggregator, not a comparison of countries.",
      projectIndicator: null,
      annotation: null,
      note: "EUROPE is shown as the portal labels it.",
      sourceLine: sourceLine(sources, metrics["eu.datasets_total"]!),
      sourceTarget: { metricId: "eu.datasets_total" },
      summary: "Records by provenance: " + provBars.map((r) => `${r.label} ${fmtInt(r.value)}`).join(", ") + ".",
      table: {
        caption: "EU-portal records by provenance value",
        columns: [
          { key: "provenance", header: "Provenance value" },
          { key: "records", header: "Records", align: "right" },
          { key: "share", header: "Share of the EU total", align: "right" },
        ],
        rows: provRows.map((r) => ({
          provenance: r.label,
          records: r.records === 0 ? "0: absent from the complete provenance facet" : fmtInt(r.records),
          share: fmtShare(r.records, euTotal),
        })),
      },
      metricIds: ["eu.datasets_total"],
    }),
    rows: provBars,
  } as ChartBundle["C13"];

  // Segment shares of every 100 % bar, computed here from the counts so no share is computed in the browser.
  for (const [chart, decimals] of [[C2, 1], [C6, 2], [C7, 2], [C8, 1], [C10, 1]] as const) {
    for (const row of chart.rows) {
      for (const seg of row.segments) {
        seg.shareLabel = fmtShare(seg.value, row.total, decimals);
        seg.fraction = fmtFraction(seg.value, row.total);
      }
    }
  }
  return { C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13 };
}
