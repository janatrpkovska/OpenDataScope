// Server-side view builders: turn bundle rows into display rows for pages. Every number is read
// from the frozen tables and formatted here; nothing is typed.
import { data, derived, derivedDisplay, metric, portal } from "./index";
import { fmtDayShort, fmtInt, fmtPct, fmtReadingValue, fmtShare } from "./format";
import type { CompareCell, CompareRow, ContextRow, FeatureId, PortalId, Row, SnapshotLayer, ValidationReading } from "./types";
import { COMPARE_ROWS } from "@/content/compare";
import { formatDerived } from "./tokens";
import { LAYERS, PROCESS_FACTS } from "@/content/methodology";
import { SOURCE_TYPE_LABEL, LAYER_LABEL } from "@/content/copy";
import { NBSP, fmtReadingTimeShort, fmtSigned, fmtUtc } from "./format";
import { DERIVED_LABEL } from "@/content/metricLabels";

/** "Homepage on 9 Oct 2026: 768 datasets · 133 organisations · 9 groups · 25 catalogues (label not documented)" */
export function homepageValidation(portalId: "mk", sourceId: string): { day: string | null; items: { reading: ValidationReading; text: string }[] } {
  const rows = data.validation.filter((v) => v.portalId === portalId && v.sourceId === sourceId && v.visibleNumber !== null);
  const ymd = rows[0] ? /(\d{4}-\d{2}-\d{2})/.exec(rows[0].readingTime)?.[1] : undefined;
  return {
    day: ymd ? fmtDayShort(ymd) : null,
    items: rows.map((r) => ({
      reading: r,
      text: `${fmtReadingValue(r.visibleValue, r.visibleNumber)} ${r.metric}${/not documented/i.test(r.note) ? " (label not documented)" : ""}`,
    })),
  };
}

/** SerbiaContextPanel rows: context only, never a ranking. */
export function serbiaContextRows(): ContextRow[] {
  const mk = portal("mk");
  const rs = portal("rs");
  const n = (id: string) => metric(id).value as number;
  const prov = (code: string) => data.euProvenance.find((p) => p.countryCode === code)!;
  const largest = [...data.publishers].filter((p) => p.active).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0]!;
  return [
    {
      measure: "Datasets",
      mk: `${fmtInt(n("mk.datasets_total"))} datasets`,
      rs: `${fmtInt(n("rs.datasets_total"))} datasets`,
      note: `Both count datasets; ${mk.platform ?? "CKAN"} and ${rs.platform ?? "udata"}.`,
      status: "context_only",
      mkTarget: { metricId: "mk.datasets_total" },
      rsTarget: { metricId: "rs.datasets_total" },
    },
    {
      measure: "Resources",
      mk: `${fmtInt(n("mk.resources_total"))} resources`,
      rs: `${fmtInt(n("rs.resources_total"))} resources`,
      note: "Files and links attached to datasets.",
      status: "context_only",
      mkTarget: { metricId: "mk.resources_total" },
      rsTarget: { metricId: "rs.resources_total" },
    },
    {
      measure: "Organisations",
      mk: `${fmtInt(n("mk.organisations_listed"))} listed`,
      rs: `${fmtInt(n("rs.organizations_total"))} registered`,
      note: "Listed or registered organisations, not active publishers.",
      status: "context_only",
      mkTarget: { metricId: "mk.organisations_listed" },
      rsTarget: { metricId: "rs.organizations_total" },
    },
    {
      measure: "Largest publisher",
      mk: `${largest.titleEn ?? largest.titleOriginal}: ${fmtInt(largest.datasets)} datasets (${fmtShare(largest.datasets, n("mk.datasets_total"))})`,
      rs: `${fmtInt(n("rs.largest_publisher_datasets"))} datasets (${derivedDisplay("rs.largest_publisher_share")})`,
      note: "Share of each portal's own datasets.",
      status: "context_only",
      mkTarget: { metricId: "mk.publishers_active" },
      rsTarget: { derivedId: "rs.largest_publisher_share" },
    },
    {
      measure: "Records on data.europa.eu",
      mk: `${fmtInt(prov("mk").records)} records`,
      rs: `${fmtInt(prov("rs").records)} records`,
      note: "Same provenance facet of the EU portal (S1).",
      status: "context_only",
      mkTarget: { metricId: "mk.records_on_data_europa_eu" },
      rsTarget: { sourceId: "S1-eu-search" },
    },
  ];
}

/** The 62 active publishers, ranked (competition ranking, ties share a rank). */
export function activePublisherRows(): Row[] {
  return [...data.publishers]
    .filter((p) => p.active)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || b.datasets - a.datasets)
    .map((p) => ({
      rank: p.rank,
      publisher: p.titleEn ?? p.titleOriginal,
      original: p.titleOriginal,
      type: p.localGovernment ? "Local government" : "Central body or other",
      datasets: fmtInt(p.datasets),
      share: fmtPct(p.sharePct, 1),
    }));
}

/** The 19 raw format labels and the format each maps to. */
export function rawLabelRows(): Row[] {
  return [...data.formatLabelsRaw]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ raw: r.raw === "" ? "(empty)" : r.raw, normalised: r.normalised === "(empty)" ? "No format given" : r.normalised, resources: fmtInt(r.count) }));
}

export { derived, formatDerived };

// ---------- Compare ----------

const ALL_PORTALS: PortalId[] = ["mk", "uk", "us", "de", "fr", "nl", "es", "eu", "rs"];
const MATRIX_ROWS: Partial<Record<string, FeatureId>> = {
  publishers: "publishers",
  api: "api",
  formats: "formats",
  licensing: "licensing",
  metadata_standard: "metadata_standard",
  hvd: "hvd",
  metadata_activity: "metadata_activity",
};

/** Top-five publisher share printed in the publishers row where Phase 1 recorded it. */
function topFiveLine(id: PortalId): { text: string; metricIds: string[] } | null {
  if (id === "mk") return { text: `Top five publishers hold ${derivedDisplay("mk.top5_share")} of datasets`, metricIds: ["derived.mk.top5_share"] };
  const m = data.metrics[`${id}.top5_share_pct`];
  if (m && typeof m.value === "number") return { text: `Top five publishers hold ${fmtPct(m.value, 1)} of records`, metricIds: [m.id] };
  return null;
}

export function compareRows(): CompareRow[] {
  return COMPARE_ROWS.map((row) => {
    const cells: Partial<Record<PortalId, CompareCell>> = {};
    for (const id of ALL_PORTALS) {
      const p = portal(id);
      const national = p.portalClass === "national";
      const head = metric(p.headlineMetricId);
      const feature = MATRIX_ROWS[row.id];
      if (row.id === "size") {
        const v = head.value;
        cells[id] = {
          portalId: id,
          state: v === null ? (head.missingReason ?? "not_reliably_available") : "available",
          display: v === null ? "" : `${fmtInt(v as number)} ${p.unitLabel}`,
          secondary: p.unitNote,
          status: v === null ? null : national ? "partial" : "context_only",
          metricIds: [head.id],
          sourceIds: [head.sourceId],
          target: { metricId: head.id },
          layer: head.snapshotId as SnapshotLayer,
        };
      } else if (row.id === "portal_type") {
        cells[id] = {
          portalId: id,
          state: "available",
          display: p.portalType,
          secondary: p.platform,
          status: "context_only",
          metricIds: [],
          sourceIds: ["P1-report"],
          target: { sourceId: "P1-report" },
          layer: "docs",
        };
      } else if (row.id === "count_definition") {
        cells[id] = {
          portalId: id,
          state: "available",
          display: head.countDefinition,
          secondary: head.includesNonOpen === "yes" ? "Includes non-open records." : null,
          status: "context_only",
          metricIds: [head.id],
          sourceIds: [head.sourceId],
          target: { metricId: head.id },
          layer: head.snapshotId as SnapshotLayer,
        };
      } else if (feature) {
        const c = data.access.find((a) => a.portalId === id && a.feature === feature);
        if (!c) throw new Error(`compare: no access cell ${id}.${feature}`);
        const top5 = row.id === "publishers" ? topFiveLine(id) : null;
        cells[id] = {
          portalId: id,
          state: c.state,
          display: c.display,
          secondary: top5?.text ?? (c.note || null),
          status: c.comparability,
          metricIds: [...c.metricIds, ...(top5?.metricIds ?? [])],
          sourceIds: c.sourceIds,
          target: { cell: { portalId: id, feature } },
          layer: c.layer as SnapshotLayer | null,
        };
      }
    }
    return { id: row.id, label: row.label, why: row.why, cells };
  });
}

// ---------- Portal detail pages ----------
export interface CountryView {
  glance: { metricId: string; derivedId?: string }[];
  publishersCell: import("./types").AccessCapability | null;
  themesCell: import("./types").AccessCapability | null;
  hidden: string[];
  readings: ValidationReading[];
  provenanceRows: Row[] | null;
}

export function countryView(id: PortalId): CountryView {
  const p = portal(id);
  const metrics = Object.values(data.metrics).filter((m) => m.portalId === id && m.id !== p.headlineMetricId && (m.role === "detail" || m.role === "context"));
  const glance = metrics.map((m) => ({
    metricId: m.id,
    derivedId: m.id === "us.largest_publisher_records" ? "us.largest_publisher_share" : m.id === "rs.largest_publisher_datasets" ? "rs.largest_publisher_share" : undefined,
  }));
  const cell = (f: FeatureId) => data.access.find((a) => a.portalId === id && a.feature === f) ?? null;
  const pub = cell("publishers");
  const th = cell("themes");
  const hidden: string[] = [];
  if (!glance.length) hidden.push("glance");
  const publishersCell = pub && pub.state !== "not_collected" ? pub : null;
  if (!publishersCell) hidden.push("publishers");
  const themesCell = th && th.state !== "not_collected" ? th : null;
  if (!themesCell) hidden.push("themes");
  const readings = data.validation.filter((v) => v.portalId === id);
  if (!readings.length) hidden.push("validation");
  let provenanceRows: Row[] | null = null;
  if (id === "eu") {
    provenanceRows = Object.values(data.metrics)
      .filter((m) => m.metric === "records_on_data_europa_eu_catalogue")
      .map((m) => {
        const pp = portal(m.portalId);
        const head = metric(pp.headlineMetricId);
        return {
          portal: pp.country,
          catalogue: m.countDefinition.replace(/^Records from catalogue /, ""),
          harvested: fmtInt(m.value as number),
          canonical: `${fmtInt(head.value as number)} ${pp.unitLabel}`,
          note: m.comparabilityNote,
          metricId: m.id,
          headId: head.id,
        };
      });
  }
  return { glance, publishersCell, themesCell, hidden, readings, provenanceRows };
}

// ---------- Methodology ----------

const skopje = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 2 * 3600 * 1000).toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 19)}`;
};

/** Collection layers with their canonical retrieval window computed from metrics.csv. */
export function layerRows(): Row[] {
  const span = (layer: string) => {
    const ms = Object.values(data.metrics).filter((m) => m.snapshotId === layer);
    const starts = ms.map((m) => m.retrievedAtUtc.start);
    const ends = ms.map((m) => m.retrievedAtUtc.end ?? m.retrievedAtUtc.start);
    return { start: starts.reduce((a, b) => (a < b ? a : b)), end: ends.reduce((a, b) => (a > b ? a : b)) };
  };
  return LAYERS.map((l) => {
    if (l.id === "S1" || l.id === "S2" || l.id === "R1") {
      const s = span(l.id);
      return { layer: l.id, what: l.what, role: l.role, utc: `${fmtUtc(s.start)} – ${s.end.slice(11, 19)} UTC`, local: `${skopje(s.start)} – ${skopje(s.end).slice(11)} (UTC+2)` };
    }
    if (l.id === "V") return { layer: l.id, what: l.what, role: l.role, utc: data.snapshot.validationLabel.replace(/^Validation readings: /, ""), local: "Same day, local time per reading" };
    if (l.id === "earlier") return { layer: "Earlier", what: l.what, role: l.role, utc: "Per row in the validation register", local: "Per row" };
    return { layer: "Docs", what: l.what, role: l.role, utc: "Publication dates as cited", local: "Not applicable" };
  });
}

export function processFacts() {
  return PROCESS_FACTS;
}

export function sourceTypeRows(): Row[] {
  const counts = new Map<string, number>();
  for (const s of data.sources) counts.set(s.sourceType, (counts.get(s.sourceType) ?? 0) + 1);
  return [...counts.entries()].map(([type, n]) => ({ type: SOURCE_TYPE_LABEL[type] ?? type, sources: fmtInt(n) }));
}

/** Later (V) readings of each national portal's headline count against the canonical snapshot value. */
export function driftRows(): Row[] {
  const nat = data.portals.filter((p) => p.portalClass === "national");
  return nat.flatMap((p) =>
    data.validation
      .filter((v) => v.layer === "V" && v.canonicalMetricId === p.headlineMetricId && v.visibleNumber !== null)
      .map((v) => ({
        portal: p.country,
        readingName: v.metric,
        canonical: `${fmtInt(metric(p.headlineMetricId).value as number)} ${p.unitLabel}`,
        reading: fmtReadingValue(v.visibleValue, v.visibleNumber),
        difference: v.difference === null ? null : v.difference === 0 ? "no difference" : fmtSigned(v.difference),
        difference__missing: "not_applicable",
        drift: v.differencePct === null ? null : v.differencePct === 0 ? "no difference" : `${fmtSigned(v.differencePct, 3)}${NBSP}%`,
        drift__missing: "not_applicable",
        id: v.id,
      })),
  );
}

export function formatMapRows(): Row[] {
  return data.formats.map((f) => ({
    format: f.label,
    class: f.formatClass === "open_machine_readable" ? "Open and machine-readable" : f.formatClass === "machine_readable_proprietary" ? "Machine-readable, proprietary" : f.formatClass === "not_machine_readable" ? "Not machine-readable" : "No format given",
    raw: f.rawLabels.map((r) => `${r.raw} (${fmtInt(r.count)})`).join(", "),
    resources: fmtInt(f.resourceCount),
  }));
}

export function themeRows(): Row[] {
  return data.themes.filter((t) => t.code !== "NONE").map((t) => ({ code: t.code, name: t.name, short: t.shortLabel, datasets: fmtInt(t.datasets) }));
}

export function derivedRows(): Row[] {
  return Object.values(data.derived).map((d) => ({
    id: d.id,
    indicator: DERIVED_LABEL[d.id] ?? d.id,
    formula: d.formula,
    inputs: d.inputs.join(", "),
    value: formatDerived(d),
    project: d.projectDefined ? "Project-defined indicator" : "Derived value",
    rule: !d.projectDefined
      ? ""
      : /open_format/.test(d.formula + d.inputs.join(" "))
        ? "open_format"
        : /machine_readable/.test(d.formula + d.inputs.join(" "))
          ? "machine_readable"
          : "local_government",
  }));
}

export function countDefinitionRows(): Row[] {
  return data.portals.map((p) => {
    const m = metric(p.headlineMetricId);
    return {
      portal: p.country,
      unit: p.unitLabel,
      definition: m.countDefinition,
      nonOpen: m.includesNonOpen === "yes" ? "Yes" : m.includesNonOpen === "no" ? "No" : "Not documented",
      note: m.comparabilityNote || p.unitNote,
      metricId: m.id,
    };
  });
}

export function validationRegisterRows(): Row[] {
  return data.validation.map((v) => ({
    id: v.id,
    reading: `${portal(v.portalId).country}: ${v.metric}`,
    value: fmtReadingValue(v.visibleValue, v.visibleNumber),
    kind: v.layer === "V" ? "Later validation reading" : "Earlier reading (superseded)",
    time: fmtReadingTimeShort(v.readingTime),
    difference: v.visibleNumber === null || v.difference === null ? null : v.difference === 0 ? "no difference" : `${fmtSigned(v.difference)}${v.differencePct !== null ? ` (${fmtSigned(v.differencePct, 3)}${NBSP}%)` : ""}`,
    difference__missing: "not_applicable",
    note: v.visibleValue.startsWith("HTTP 504") && !/^Timeout, not missing data/.test(v.note) ? `Timeout, not missing data. ${v.note}` : v.note,
  }));
}

export function sourceRegisterRows(): Row[] {
  return data.sources.map((s) => ({
    id: s.id,
    title: s.title,
    issuer: s.issuer,
    type: SOURCE_TYPE_LABEL[s.sourceType] ?? s.sourceType,
    layer: LAYER_LABEL[s.layer] ?? s.layer,
    retrieved: s.retrievedAt ? fmtUtc(s.retrievedAt) : "No retrieval time (structural evidence)",
    url: s.urlStatus,
  }));
}
