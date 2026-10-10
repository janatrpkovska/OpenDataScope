// Core data build. Node-only: reads the 15 CSV files, runs build checks 1–9,
// and returns the typed bundle. Check 10 (no hard-coded statistics) runs in scripts/build-data.ts.
// Any failure throws BuildCheckError naming the check, file, row and rule; no page is ever
// generated from unvalidated data.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { ZodType } from "zod";
import { CONCLUSION } from "../content/conclusion";
import { FINDINGS } from "../content/findings";
import { OPPORTUNITIES } from "../content/opportunities";
import { TEXT_TEMPLATES } from "../content/text";
import { METHODOLOGY_TEMPLATES } from "../content/methodology";
import { buildCharts } from "./charts";
import { competitionRanks, computeDerived } from "./derive";
import { round } from "./format";
import { CSV_FILES, SCHEMAS, type CsvName } from "./schema";
import { metricInputs, renderTemplate, TOKEN_RE, type TokenContext } from "./tokens";
import type {
  AccessCapability,
  Bundle,
  CapabilityState,
  ComparabilityStatus,
  DownloadFile,
  EuProvenance,
  FeatureId,
  FormatClass,
  FormatMetric,
  Metric,
  Portal,
  PortalId,
  PublisherMetric,
  RawFormatLabel,
  RenderedFinding,
  SnapshotInfo,
  SnapshotLayer,
  SourceRecord,
  ThemeMetric,
  ThemeProfileRow,
  TokenLogEntry,
  ValidationReading,
} from "./types";

export class BuildCheckError extends Error {
  constructor(
    public readonly check: number,
    public readonly rule: string,
    detail: string,
    public readonly file?: string,
    public readonly row?: number,
  ) {
    super(`[data] build check ${check} failed (${rule})${file ? ` in ${file}` : ""}${row !== undefined ? ` at line ${row}` : ""}: ${detail}`);
    this.name = "BuildCheckError";
  }
}

type Raw = Record<string, string>;

export interface CsvTable {
  name: CsvName;
  text: string;
  rows: Raw[];
}

export function sha256(text: string | Buffer): string {
  return createHash("sha256").update(text).digest("hex");
}

// ---------- check 1: Phase 1 checksums ----------
export function verifyChecksums(dataDir: string): { file: string; sha256: string }[] {
  const listPath = path.join(dataDir, "phase1", "CHECKSUMS.sha256");
  let list: string;
  try {
    list = readFileSync(listPath, "utf8");
  } catch {
    throw new BuildCheckError(1, "checksums", "CHECKSUMS.sha256 is missing", "phase1/CHECKSUMS.sha256");
  }
  const entries = list
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(l);
      if (!m) throw new BuildCheckError(1, "checksums", `malformed line: ${l}`, "phase1/CHECKSUMS.sha256");
      return { hash: m[1]!, file: m[2]! };
    });
  const expected = CSV_FILES.filter((f) => f.startsWith("phase1/")).map((f) => f.slice("phase1/".length));
  for (const f of expected) {
    if (!entries.some((e) => e.file === f)) throw new BuildCheckError(1, "checksums", `no checksum recorded for ${f}`, "phase1/CHECKSUMS.sha256");
  }
  return entries.map((e) => {
    let bytes: Buffer;
    try {
      bytes = readFileSync(path.join(dataDir, "phase1", e.file));
    } catch {
      throw new BuildCheckError(1, "checksums", `file listed in CHECKSUMS.sha256 is missing`, `phase1/${e.file}`);
    }
    const actual = sha256(bytes);
    if (actual !== e.hash) {
      throw new BuildCheckError(1, "checksums", `SHA-256 mismatch: expected ${e.hash}, found ${actual}. Phase 1 data is frozen and must not change.`, `phase1/${e.file}`);
    }
    return { file: `phase1/${e.file}`, sha256: actual };
  });
}

// ---------- check 2: zod validation of every row ----------
export function readTables(dataDir: string): Record<CsvName, CsvTable> {
  const out = {} as Record<CsvName, CsvTable>;
  for (const name of CSV_FILES) {
    const file = path.join(dataDir, name);
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      throw new BuildCheckError(2, "file", "required CSV is missing", name);
    }
    const parsed = Papa.parse<Raw>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      const e = parsed.errors[0]!;
      throw new BuildCheckError(2, "csv-parse", e.message, name, (e.row ?? 0) + 2);
    }
    const schema = SCHEMAS[name] as unknown as ZodType;
    parsed.data.forEach((row, i) => {
      const r = schema.safeParse(row);
      if (!r.success) {
        const issue = r.error.issues[0]!;
        throw new BuildCheckError(2, "zod", `${issue.path.join(".") || "row"}: ${issue.message}`, name, i + 2);
      }
    });
    out[name] = { name, text, rows: parsed.data };
  }
  return out;
}

function parseValue(raw: string): number | string {
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
}

function int(raw: string, where: string): number {
  if (raw.trim() === "") throw new BuildCheckError(2, "empty-number", "a number was expected but the cell is empty", where);
  return Number(raw);
}

const split = (s: string) => (s ? s.split(";").filter(Boolean) : []);

export function buildBundle(dataDir: string): Bundle {
  const checksums = verifyChecksums(dataDir); // check 1
  const T = readTables(dataDir); // check 2
  const rows = (n: CsvName) => T[n].rows;

  // ---------- sources ----------
  const sources: SourceRecord[] = rows("reference/sources.csv").map((r) => ({
    id: r.source_id!,
    title: r.title!,
    issuer: r.issuer!,
    portalIds: r.portal_ids!.split(";") as PortalId[],
    sourceType: r.source_type as SourceRecord["sourceType"],
    layer: r.layer as SnapshotLayer,
    url: r.url ? r.url : null,
    urlStatus: r.url_status as SourceRecord["urlStatus"],
    retrievedAt: r.retrieved_at ? r.retrieved_at : null,
    rawFile: r.raw_file ? r.raw_file : null,
    usedFor: r.used_for!,
  }));
  if (new Set(sources.map((s) => s.id)).size !== sources.length) throw new BuildCheckError(3, "unique-source-ids", "duplicate source_id", "reference/sources.csv");

  // ---------- metrics (check 3: unique ids, source URL + layer resolves to exactly one source) ----------
  const metrics: Record<string, Metric> = {};
  const addMetrics = (name: CsvName, origin: Metric["origin"]) => {
    rows(name).forEach((r, i) => {
      const id = `${r.portal_id}.${r.metric}`;
      if (metrics[id]) throw new BuildCheckError(3, "unique-metric-ids", `duplicate metric id ${id}`, name, i + 2);
      const matches = sources.filter((s) => s.url === r.source_url && s.layer === r.snapshot_id);
      if (matches.length !== 1) {
        throw new BuildCheckError(3, "source-resolves", `${id}: source_url + layer ${r.snapshot_id} matches ${matches.length} rows in sources.csv`, name, i + 2);
      }
      const [start, end] = r.retrieved_at_utc!.split("/");
      const value = parseValue(r.value!);
      metrics[id] = {
        id,
        portalId: r.portal_id as PortalId,
        metric: r.metric!,
        value,
        missingReason: null,
        unit: r.unit!,
        countDefinition: r.count_definition!,
        comparabilityNote: r.comparability_note!,
        includesNonOpen: r.includes_non_open as Metric["includesNonOpen"],
        status: r.status as Metric["status"],
        role: r.role as Metric["role"],
        snapshotId: r.snapshot_id as Metric["snapshotId"],
        sourceUrl: r.source_url!,
        sourceId: matches[0]!.id,
        retrievedAtUtc: { start: start!, end: end ?? null },
        retrievedAtLocal: r.retrieved_at_local!,
        rawSnapshot: r.raw_snapshot ? r.raw_snapshot : null,
        extractionMethod: r.extraction_method!,
        origin,
      };
    });
  };
  addMetrics("phase1/metrics.csv", "metrics");
  addMetrics("reference/metrics_supplement.csv", "metrics_supplement");
  for (const m of Object.values(metrics)) {
    if (m.value === null && !m.missingReason) throw new BuildCheckError(3, "null-needs-reason", `${m.id} is null without a missing reason`);
  }

  // ---------- portals (check 4: exactly one datasets_total per portal) ----------
  const portals: Portal[] = rows("reference/portals.csv")
    .map((r) => ({
      id: r.portal_id as PortalId,
      slug: r.slug!,
      country: r.country!,
      portalName: r.portal_name!,
      domain: r.domain!,
      displayName: r.display_name!,
      portalClass: r.portal_class as Portal["portalClass"],
      isReference: r.is_reference === "true",
      url: r.url!,
      platform: r.platform ? r.platform : null,
      portalType: r.portal_type!,
      headlineMetricId: r.headline_metric_id!,
      unitLabel: r.unit_label!,
      unitNote: r.unit_note!,
      includesNonOpen: r.includes_non_open as Portal["includesNonOpen"],
      colorToken: r.color_token!,
      displayOrder: Number(r.display_order),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  if (portals.length !== 9) throw new BuildCheckError(4, "nine-portals", `expected 9 portals, found ${portals.length}`, "reference/portals.csv");
  for (const p of portals) {
    const totals = Object.values(metrics).filter((m) => m.portalId === p.id && m.metric === "datasets_total");
    if (totals.length !== 1) throw new BuildCheckError(4, "one-datasets-total", `${p.id} has ${totals.length} datasets_total rows`);
    if (p.headlineMetricId !== totals[0]!.id) throw new BuildCheckError(4, "headline-metric", `${p.id} headline_metric_id does not point at datasets_total`, "reference/portals.csv");
  }

  // ---------- themes, formats, publishers, provenance ----------
  const labels = new Map(rows("reference/theme_labels.csv").map((r) => [r.theme_code!, r]));
  const themes: ThemeMetric[] = rows("phase1/mk_themes.csv").map((r) => {
    const code = (r.theme_code === "(none)" ? "NONE" : r.theme_code) as ThemeMetric["code"];
    const l = labels.get(code);
    if (!l) throw new BuildCheckError(5, "theme-label", `no label for ${code}`, "reference/theme_labels.csv");
    return { code, name: r.theme_name!, shortLabel: l.short_label!, datasets: int(r.datasets!, "mk_themes"), shareOfDatasetsPct: Number(r.share_of_datasets_pct), snapshotId: "S2" };
  });
  const themeProfile: ThemeProfileRow[] = rows("phase1/theme_profile_mk_vs_eu.csv").map((r) => ({
    code: r.theme_code as ThemeProfileRow["code"],
    name: r.theme_name!,
    shortLabel: labels.get(r.theme_code!)!.short_label!,
    mkDatasets: Number(r.mk_datasets),
    mkPctOfDatasets: Number(r.mk_pct_of_datasets),
    mkPctOfAssignments: Number(r.mk_pct_of_assignments),
    euRecords: Number(r.eu_records),
    euPctOfAssignments: Number(r.eu_pct_of_assignments),
    mkToEuRatio: Number(r.mk_to_eu_ratio),
  }));
  const formatLabelsRaw: RawFormatLabel[] = rows("phase1/mk_format_labels_raw.csv").map((r) => ({ raw: r.format_raw!, normalised: r.format_normalised!, count: Number(r.resource_count) }));
  const formats: FormatMetric[] = rows("phase1/mk_format_shares.csv").map((r) => {
    const mr = r.machine_readable === "True";
    const open = r.open_format === "True";
    const empty = r.format_normalised === "(empty)";
    if (open && !mr) throw new BuildCheckError(5, "format-class", `${r.format_normalised} is open but not machine-readable`, "phase1/mk_format_shares.csv");
    const formatClass: FormatClass = empty ? "no_format" : open ? "open_machine_readable" : mr ? "machine_readable_proprietary" : "not_machine_readable";
    return {
      format: r.format_normalised!,
      label: empty ? "No format given" : r.format_normalised!,
      resourceCount: Number(r.resource_count),
      shareOfResourcesPct: Number(r.share_of_resources_pct),
      datasetsOffering: Number(r.datasets_offering),
      shareOfDatasetsPct: Number(r.share_of_datasets_pct),
      machineReadable: mr,
      openFormat: open,
      formatClass,
      rawLabels: formatLabelsRaw.filter((l) => l.normalised === r.format_normalised).map((l) => ({ raw: l.raw, count: l.count })),
      snapshotId: "S2",
    };
  });
  const names = new Map(rows("reference/mk_publisher_names_en.csv").map((r) => [r.org_name!, r]));
  const pubRows = rows("phase1/mk_publishers.csv");
  const activeCounts = pubRows.filter((r) => r.active === "True").map((r) => Number(r.datasets));
  const ranks = competitionRanks(activeCounts);
  let ai = 0;
  const publishers: PublisherMetric[] = pubRows.map((r) => {
    const active = r.active === "True";
    const name = names.get(r.org_name!);
    if (active && !name) throw new BuildCheckError(5, "english-name", `active publisher ${r.org_name} has no English name`, "reference/mk_publisher_names_en.csv");
    if (name && name.title_original !== r.title) throw new BuildCheckError(5, "english-name", `title mismatch for ${r.org_name}`, "reference/mk_publisher_names_en.csv");
    return {
      orgName: r.org_name!,
      titleOriginal: r.title!,
      titleEn: name ? name.title_en! : null,
      translationMethod: name ? (name.translation_method as PublisherMetric["translationMethod"]) : null,
      localGovernment: r.local_government === "True",
      datasets: Number(r.datasets),
      sharePct: Number(r.share_pct),
      active,
      rank: active ? ranks[ai++]! : null,
      snapshotId: "S2",
    };
  });
  const countryNames = Object.fromEntries(rows("reference/country_names.csv").map((r) => [r.country_code!, r.name!]));
  const euProvenance: EuProvenance[] = rows("phase1/eu_provenance.csv").map((r) => {
    const label = countryNames[r.country_code!];
    if (!label) throw new BuildCheckError(5, "country-name", `no name for provenance code ${r.country_code}`, "reference/country_names.csv");
    return { countryCode: r.country_code!, label, records: Number(r.records_on_data_europa_eu), snapshotId: "S1" };
  });

  const num = (id: string) => {
    const v = metrics[id]?.value;
    if (typeof v !== "number") throw new BuildCheckError(5, "metric", `${id} missing or not numeric`);
    return v;
  };

  // ---------- check 5: MK totals reconcile ----------
  const resources = num("mk.resources_total");
  const datasets = num("mk.datasets_total");
  const sumFormats = formats.reduce((s, f) => s + f.resourceCount, 0);
  if (sumFormats !== resources) throw new BuildCheckError(5, "formats-sum", `format resource counts sum to ${sumFormats}, not ${resources}`, "phase1/mk_format_shares.csv");
  const sumRaw = formatLabelsRaw.reduce((s, l) => s + l.count, 0);
  if (sumRaw !== resources) throw new BuildCheckError(5, "raw-labels-sum", `raw labels sum to ${sumRaw}, not ${resources}`, "phase1/mk_format_labels_raw.csv");
  if (new Set(formatLabelsRaw.map((l) => l.raw)).size !== formatLabelsRaw.length) throw new BuildCheckError(5, "raw-label-mapped-once", "a raw label appears twice", "phase1/mk_format_labels_raw.csv");
  for (const l of formatLabelsRaw) {
    if (!formats.some((f) => f.format === l.normalised)) throw new BuildCheckError(5, "raw-label-mapped", `raw label ${l.raw} maps to unknown format ${l.normalised}`, "phase1/mk_format_labels_raw.csv");
  }
  for (const f of formats) {
    const s = f.rawLabels.reduce((a, b) => a + b.count, 0);
    if (s !== f.resourceCount) throw new BuildCheckError(5, "raw-labels-per-format", `${f.format}: raw labels sum to ${s}, not ${f.resourceCount}`);
  }
  if (formatLabelsRaw.length !== num("mk.format_labels_raw_resource_level")) throw new BuildCheckError(5, "raw-label-count", "raw label rows differ from mk.format_labels_raw_resource_level");
  const none = themes.find((x) => x.code === "NONE");
  if (!none || none.datasets + num("mk.datasets_with_theme") !== datasets) throw new BuildCheckError(5, "themes-sum", "no-theme + themed datasets do not equal datasets_total", "phase1/mk_themes.csv");
  if (pubRows.length !== num("mk.organisations_listed")) throw new BuildCheckError(5, "publishers-listed", `${pubRows.length} rows, ${num("mk.organisations_listed")} listed`, "phase1/mk_publishers.csv");
  if (activeCounts.length !== num("mk.publishers_active")) throw new BuildCheckError(5, "publishers-active", `${activeCounts.length} active rows vs mk.publishers_active`, "phase1/mk_publishers.csv");
  const pubDatasets = publishers.reduce((s, p) => s + p.datasets, 0);
  if (pubDatasets !== datasets) throw new BuildCheckError(5, "publishers-datasets", `publishers hold ${pubDatasets}, not ${datasets}`, "phase1/mk_publishers.csv");
  if (publishers.filter((p) => !p.active).some((p) => p.datasets !== 0)) throw new BuildCheckError(5, "inactive-zero", "an inactive organisation holds datasets", "phase1/mk_publishers.csv");
  const localActive = publishers.filter((p) => p.active && p.localGovernment);
  if (localActive.length !== num("mk.active_local_government_publishers")) throw new BuildCheckError(5, "local-active", "active local-government count differs");
  if (localActive.reduce((s, p) => s + p.datasets, 0) !== num("mk.datasets_from_local_government")) throw new BuildCheckError(5, "local-datasets", "local-government datasets differ");
  if (num("mk.datasets_open_licence_id") + num("mk.datasets_licence_not_specified") + num("mk.datasets_no_licence_id") !== datasets) throw new BuildCheckError(5, "licences-sum", "MK licence groups do not sum to datasets_total");
  if (["licence_cc_zero", "licence_other_open", "licence_other_pd", "licence_cc_by"].reduce((s, k) => s + num(`mk.${k}`), 0) !== num("mk.datasets_open_licence_id")) throw new BuildCheckError(5, "licence-breakdown", "open-licence breakdown does not sum");
  if (euProvenance.filter((p) => p.countryCode === "mk").length !== 1 || euProvenance.find((p) => p.countryCode === "mk")!.records !== num("mk.records_on_data_europa_eu")) throw new BuildCheckError(5, "mk-provenance", "MK provenance row disagrees with mk.records_on_data_europa_eu");

  // ---------- check 6: derived shares equal stored shares ----------
  const close = (computed: number, stored: string, what: string, file: CsvName) => {
    const d = stored.includes(".") ? stored.split(".")[1]!.length : 0;
    if (Math.abs(computed - Number(stored)) > 0.5 * 10 ** -d + 1e-9) {
      throw new BuildCheckError(6, "derived-share", `${what}: computed ${round(computed, d + 2)}, stored ${stored}`, file);
    }
  };
  rows("phase1/mk_format_shares.csv").forEach((r) => {
    close((Number(r.resource_count) / resources) * 100, r.share_of_resources_pct!, `${r.format_normalised} share_of_resources_pct`, "phase1/mk_format_shares.csv");
    close((Number(r.datasets_offering) / datasets) * 100, r.share_of_datasets_pct!, `${r.format_normalised} share_of_datasets_pct`, "phase1/mk_format_shares.csv");
  });
  rows("phase1/mk_themes.csv").forEach((r) => close((Number(r.datasets) / datasets) * 100, r.share_of_datasets_pct!, `${r.theme_code} share`, "phase1/mk_themes.csv"));
  pubRows.forEach((r) => close((Number(r.datasets) / datasets) * 100, r.share_pct!, `${r.org_name} share_pct`, "phase1/mk_publishers.csv"));
  const euAssign = num("eu.theme_assignments");
  const mkAssign = num("mk.theme_assignments");
  rows("phase1/theme_profile_mk_vs_eu.csv").forEach((r) => {
    const f: CsvName = "phase1/theme_profile_mk_vs_eu.csv";
    const mkT = themes.find((x) => x.code === r.theme_code);
    if (!mkT || mkT.datasets !== Number(r.mk_datasets)) throw new BuildCheckError(6, "derived-share", `${r.theme_code} mk_datasets differs from mk_themes`, f);
    close((Number(r.mk_datasets) / datasets) * 100, r.mk_pct_of_datasets!, `${r.theme_code} mk_pct_of_datasets`, f);
    close((Number(r.mk_datasets) / mkAssign) * 100, r.mk_pct_of_assignments!, `${r.theme_code} mk_pct_of_assignments`, f);
    close((Number(r.eu_records) / euAssign) * 100, r.eu_pct_of_assignments!, `${r.theme_code} eu_pct_of_assignments`, f);
    close(Number(r.mk_datasets) / mkAssign / (Number(r.eu_records) / euAssign), r.mk_to_eu_ratio!, `${r.theme_code} mk_to_eu_ratio`, f);
  });
  if (themes.filter((x) => x.code !== "NONE").reduce((s, x) => s + x.datasets, 0) !== mkAssign) throw new BuildCheckError(6, "theme-assignments", "theme datasets do not sum to mk.theme_assignments", "phase1/mk_themes.csv");

  // ---------- check 9: validation readings link to exactly one metric ----------
  const validation: ValidationReading[] = rows("phase1/validation_readings.csv").map((r, i) => {
    const canonical = r.canonical_value === "" ? null : Number(r.canonical_value);
    const visibleNumber = /^-?\d+$/.test(r.visible_value!) ? Number(r.visible_value) : null;
    let canonicalMetricId: string | null = null;
    if (canonical !== null) {
      const cands = Object.values(metrics).filter((m) => m.portalId === r.portal_id && m.value === canonical);
      const headline = cands.filter((m) => m.role === "headline");
      const chosen = cands.length === 1 ? cands : headline;
      if (chosen.length !== 1) throw new BuildCheckError(9, "validation-link", `${r.portal_id} canonical_value ${canonical} matches ${cands.length} metrics (${headline.length} headline)`, "phase1/validation_readings.csv", i + 2);
      canonicalMetricId = chosen[0]!.id;
      if (visibleNumber !== null && r.difference !== "") {
        if (visibleNumber - canonical !== Number(r.difference)) throw new BuildCheckError(9, "validation-difference", `difference ${r.difference} ≠ ${visibleNumber} − ${canonical}`, "phase1/validation_readings.csv", i + 2);
        close(((visibleNumber - canonical) / canonical) * 100, r.difference_pct!, `difference_pct row ${i + 2}`, "phase1/validation_readings.csv");
      }
    }
    // the page a reading was taken from must resolve to exactly one validation-layer source
    const layerWanted: SnapshotLayer = r.layer === "V" ? "V" : "earlier";
    const url = /https?:\/\/\S+/.exec(r.source_page!)?.[0] ?? null;
    const srcMatches = sources.filter((s) => s.layer === layerWanted && s.portalIds.includes(r.portal_id as PortalId) && (url ? s.url === url : s.title === r.source_page));
    if (srcMatches.length !== 1) throw new BuildCheckError(9, "validation-source", `${r.portal_id} "${r.source_page}" (${layerWanted}) matches ${srcMatches.length} sources`, "phase1/validation_readings.csv", i + 2);
    return {
      id: `${r.portal_id}.v${i + 1}`,
      portalId: r.portal_id as PortalId,
      metric: r.metric!,
      visibleValue: r.visible_value!,
      visibleNumber,
      sourcePage: r.source_page!,
      readingTime: r.reading_time!,
      layer: r.layer as ValidationReading["layer"],
      role: "validation",
      canonicalValue: canonical,
      difference: r.difference === "" ? null : Number(r.difference),
      differencePct: r.difference_pct === "" ? null : Number(r.difference_pct),
      note: r.note!,
      canonicalMetricId,
      sourceId: srcMatches[0]!.id,
    };
  });

  // ---------- derived values (I4) ----------
  const derived = computeDerived({
    metrics,
    formats,
    themes,
    publishers,
    euProvenance,
    nationalPortalIds: portals.filter((p) => p.portalClass === "national").map((p) => p.id),
  });

  // ---------- check 7: every token resolves ----------
  const tableRows: Record<string, { key: string; rows: Raw[] }> = {
    mk_themes: { key: "theme_code", rows: rows("phase1/mk_themes.csv") },
    mk_format_shares: { key: "format_normalised", rows: rows("phase1/mk_format_shares.csv") },
    eu_provenance: { key: "country_code", rows: rows("phase1/eu_provenance.csv") },
    theme_profile_mk_vs_eu: { key: "theme_code", rows: rows("phase1/theme_profile_mk_vs_eu.csv") },
  };
  const ctx: TokenContext = {
    metric: (id) => metrics[id],
    derived: (id) => derived[id],
    reading: (id) => validation.find((v) => v.id === id),
    table: (table, key, column) => {
      if (table === "rowcount") {
        const tr = tableRows[key];
        return tr && column === "rows" ? String(tr.rows.length) : undefined;
      }
      const tr = tableRows[table];
      return tr?.rows.find((r) => r[tr.key] === key)?.[column];
    },
  };
  const tokenLog: TokenLogEntry[] = [];
  const render = (template: string, where: string) => {
    try {
      const r = renderTemplate(template, ctx, where);
      tokenLog.push(...r.log);
      return r;
    } catch (e) {
      throw new BuildCheckError(7, "token", (e as Error).message);
    }
  };

  // ---------- check 8: matrix cells ----------
  const MISSING: CapabilityState[] = ["not_reliably_available", "not_collected", "not_comparable", "not_applicable"];
  const access: AccessCapability[] = rows("reference/access_matrix.csv").map((r, i) => {
    const where = `access_matrix ${r.portal_id}.${r.feature}`;
    const state = r.state as CapabilityState;
    const comp = (r.comparability || null) as ComparabilityStatus | null;
    if ((state === "available" || state === "limited") && !comp) throw new BuildCheckError(8, "value-needs-status", `${where}: ${state} cell has no comparability status`, "reference/access_matrix.csv", i + 2);
    if (MISSING.includes(state) && comp) throw new BuildCheckError(8, "missing-has-no-status", `${where}: ${state} cell carries a comparability status`, "reference/access_matrix.csv", i + 2);
    const rendered = render(r.display_value!, where);
    const declared = split(r.metric_ids!).sort();
    const used = [...rendered.inputs].sort();
    if (JSON.stringify(declared) !== JSON.stringify(used)) throw new BuildCheckError(8, "metric-ids", `${where}: metric_ids ${declared.join(";")} ≠ tokens ${used.join(";")}`, "reference/access_matrix.csv", i + 2);
    const sourceIds = split(r.source_ids!);
    for (const s of sourceIds) if (!sources.some((x) => x.id === s)) throw new BuildCheckError(8, "source-ids", `${where}: unknown source ${s}`, "reference/access_matrix.csv", i + 2);
    if (/\d/.test(r.display_value!.replace(TOKEN_RE, "")) && sourceIds.length === 0) throw new BuildCheckError(8, "quoted-count-needs-source", `${where}: a quoted count needs a source id`, "reference/access_matrix.csv", i + 2);
    return {
      portalId: r.portal_id as PortalId,
      feature: r.feature as FeatureId,
      state,
      displayValue: r.display_value!,
      display: rendered.text,
      metricIds: rendered.inputs,
      comparability: comp,
      comparabilityReason: r.comparability_reason!,
      layer: (r.layer || null) as SnapshotLayer | null,
      sourceIds,
      note: r.note!,
    };
  });
  const features: FeatureId[] = ["api", "formats", "metadata_standard", "licensing", "hvd", "publishers", "metadata_activity", "themes"];
  for (const p of portals) for (const f of features) {
    if (access.filter((a) => a.portalId === p.id && a.feature === f).length !== 1) throw new BuildCheckError(8, "matrix-complete", `${p.id}.${f} must appear exactly once`, "reference/access_matrix.csv");
  }

  // ---------- content ----------
  const text: Record<string, string> = {};
  const textInputs: Record<string, string[]> = {};
  for (const [k, tpl] of Object.entries(TEXT_TEMPLATES)) {
    const r = render(tpl, `text.${k}`);
    text[k] = r.text;
    textInputs[k] = r.inputs;
  }
  const methodology: Record<string, string> = {};
  for (const [k, tpl] of Object.entries(METHODOLOGY_TEMPLATES)) methodology[k] = render(tpl, `methodology.${k}`).text;
  const item = (c: { id: string; template: string; status: RenderedFinding["status"]; href: string }, n: number, where: string): RenderedFinding => {
    const r = render(c.template, `${where}.${c.id}`);
    return { id: c.id, n, text: r.text, status: c.status, href: c.href, metricIds: metricInputs(r.inputs) };
  };
  const content = {
    summary: { id: "summary", n: 0, text: text.summary!, status: null, href: "#key-facts", metricIds: metricInputs(textInputs.summary ?? []) },
    findings: FINDINGS.map((c, i) => item(c, i + 1, "findings")),
    conclusion: CONCLUSION.map((c, i) => item(c, i + 1, "conclusion")),
    opportunities: OPPORTUNITIES.map((c, i) => ({ ...item(c, i + 1, "opportunities"), title: c.title, section: c.section })),
    text,
    methodology,
  };

  // ---------- snapshot ----------
  const canonicalTimes = Object.values(metrics).flatMap((m) => [m.retrievedAtUtc.start, ...(m.retrievedAtUtc.end ? [m.retrievedAtUtc.end] : [])]);
  const startUtc = canonicalTimes.reduce((a, b) => (a < b ? a : b));
  const endUtc = canonicalTimes.reduce((a, b) => (a > b ? a : b));
  const snapshot: SnapshotInfo = snapshotInfo(startUtc, endUtc, validation);

  const charts = buildCharts({ portals, metrics, validation, sources, themes, themeProfile, formats, publishers, euProvenance, derived, text, snapshotLabel: snapshot.label });

  // ---------- downloads ----------
  const sums = new Map(checksums.map((c) => [c.file, c.sha256]));
  const downloads: DownloadFile[] = CSV_FILES.map((name) => ({
    path: `data/${path.basename(name)}`,
    rows: T[name].rows.length,
    bytes: Buffer.byteLength(T[name].text, "utf8"),
    sha256: sums.get(name) ?? sha256(T[name].text),
    origin: name.startsWith("phase1/") ? "phase1" : "reference",
  }));

  return { snapshot, portals, metrics, validation, sources, themes, themeProfile, formats, formatLabelsRaw, publishers, euProvenance, countryNames, access, derived, content, charts, downloads, tokenLog };
}

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Snapshot labels; minutes are truncated, not rounded. */
export function snapshotInfo(startUtc: string, endUtc: string, validation: ValidationReading[]): SnapshotInfo {
  const d = (iso: string) => new Date(iso);
  const hm = (dt: Date) => `${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
  const day = (dt: Date) => `${dt.getUTCDate()} ${MONTH[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  const s = d(startUtc);
  const e = d(endUtc);
  const local = (dt: Date) => new Date(dt.getTime() + 2 * 3600 * 1000); // Europe/Skopje, CEST (UTC+2) on these dates
  const vRow = validation.find((v) => v.layer === "V" && /before \d{2}:\d{2}Z/.test(v.readingTime));
  const before = vRow ? /before (\d{2}:\d{2})Z/.exec(vRow.readingTime)![1] : null;
  const vDay = vRow ? /^(\d{4}-\d{2}-\d{2})/.exec(vRow.readingTime)?.[1] : null;
  return {
    startUtc,
    endUtc,
    label: `Research snapshot: ${day(s)}, ${hm(s)}–${hm(e)} UTC`,
    shortLabel: `Snapshot ${s.getUTCDate()} ${MONTH[s.getUTCMonth()]!.slice(0, 3)} ${s.getUTCFullYear()}`,
    localLabel: `${day(local(s))}, ${hm(local(s))}–${hm(local(e))} in Skopje (UTC+2)`,
    validationLabel: before && vDay ? `Validation readings: ${day(d(`${vDay}T00:00:00Z`))}, before ${before} UTC` : "Validation readings: later official-page readings",
  };
}
