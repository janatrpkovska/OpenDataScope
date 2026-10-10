// zod schemas for every CSV row.
// Rows arrive as strings; the schemas validate shape and enumerations, and reject an empty
// cell wherever a number is expected (no number is ever parsed from an empty cell).
import { z } from "zod";

const portalId = z.enum(["mk", "uk", "us", "de", "fr", "nl", "es", "eu", "rs"]);
const nonEmpty = z.string().trim().min(1, "empty cell");
const intString = z.string().regex(/^-?\d+$/, "expected an integer");
const decString = z.string().regex(/^-?\d+(\.\d+)?$/, "expected a number");
const boolString = z.enum(["True", "False"]);
const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const utcOrRange = z
  .string()
  .refine((s) => s.split("/").every((p) => isoUtc.test(p)) && s.split("/").length <= 2, "expected ISO UTC time or range");

export const metricRow = z.object({
  portal_id: portalId,
  metric: z.string().regex(/^[a-z0-9_]+$/, "metric names are snake_case"),
  value: nonEmpty, // a value is required: metrics.csv has no missing_reason column
  unit: nonEmpty,
  count_definition: nonEmpty,
  comparability_note: z.string(),
  includes_non_open: z.enum(["yes", "no", "unknown"]),
  status: z.enum(["verified_live", "verified_live_page", "verified_manual", "derived", "verified_report"]),
  role: z.enum(["headline", "detail", "context", "validation"]),
  snapshot_id: z.enum(["S1", "S2", "R1"]),
  source_url: z.string().url(),
  retrieved_at_utc: utcOrRange,
  retrieved_at_local: nonEmpty,
  raw_snapshot: z.string(),
  extraction_method: nonEmpty,
});
export type MetricRow = z.infer<typeof metricRow>;

export const validationRow = z.object({
  portal_id: portalId,
  metric: nonEmpty,
  visible_value: nonEmpty,
  source_page: nonEmpty,
  reading_time: nonEmpty,
  layer: z.enum(["V", "earlier", "earlier (R1)"]),
  role: z.literal("validation"),
  canonical_value: z.union([z.literal(""), intString]),
  difference: z.union([z.literal(""), intString]),
  difference_pct: z.union([z.literal(""), decString]),
  note: z.string(),
});
export type ValidationRow = z.infer<typeof validationRow>;

export const formatShareRow = z.object({
  format_normalised: nonEmpty,
  resource_count: intString,
  share_of_resources_pct: decString,
  datasets_offering: intString,
  share_of_datasets_pct: decString,
  machine_readable: boolString,
  open_format: boolString,
  snapshot_id: z.literal("S2"),
});

export const formatLabelRow = z.object({
  format_raw: nonEmpty,
  format_normalised: nonEmpty,
  resource_count: intString,
  snapshot_id: z.literal("S2"),
});

const themeCode = z.enum(["AGRI", "ECON", "EDUC", "ENER", "ENVI", "GOVE", "HEAL", "INTR", "JUST", "REGI", "SOCI", "TECH", "TRAN"]);

export const themeRow = z.object({
  theme_code: z.union([themeCode, z.literal("(none)")]),
  theme_name: nonEmpty,
  datasets: intString,
  share_of_datasets_pct: decString,
  snapshot_id: z.literal("S2"),
});

export const themeProfileRow = z.object({
  theme_code: themeCode,
  theme_name: nonEmpty,
  mk_datasets: intString,
  mk_pct_of_datasets: decString,
  mk_pct_of_assignments: decString,
  eu_records: intString,
  eu_pct_of_assignments: decString,
  mk_to_eu_ratio: decString,
});

export const publisherRow = z.object({
  org_name: nonEmpty,
  title: nonEmpty,
  local_government: boolString,
  datasets: intString,
  share_pct: decString,
  active: boolString,
  snapshot_id: z.literal("S2"),
});

export const provenanceRow = z.object({
  country_code: nonEmpty,
  records_on_data_europa_eu: intString,
  snapshot_id: z.literal("S1"),
});

export const portalRow = z.object({
  portal_id: portalId,
  slug: z.string().regex(/^[a-z-]+$/),
  country: nonEmpty,
  portal_name: nonEmpty,
  domain: nonEmpty,
  display_name: nonEmpty,
  portal_class: z.enum(["national", "aggregator", "regional_context"]),
  is_reference: z.enum(["true", "false"]),
  url: z.string().url(),
  platform: z.string(),
  portal_type: nonEmpty,
  headline_metric_id: z.string().regex(/^[a-z]{2}\.[a-z0-9_]+$/),
  unit_label: nonEmpty,
  unit_note: nonEmpty,
  includes_non_open: z.enum(["yes", "no", "unknown"]),
  color_token: z.string().regex(/^--[a-z-]+$/),
  display_order: intString,
});

const capabilityState = z.enum(["available", "limited", "not_reliably_available", "not_collected", "not_comparable", "not_applicable"]);

export const accessRow = z.object({
  portal_id: portalId,
  feature: z.enum(["api", "formats", "metadata_standard", "licensing", "hvd", "publishers", "metadata_activity", "themes"]),
  state: capabilityState,
  display_value: nonEmpty,
  metric_ids: z.string(),
  comparability: z.union([z.literal(""), z.enum(["direct", "partial", "context_only"])]),
  comparability_reason: z.string(),
  layer: z.union([z.literal(""), z.enum(["S1", "S2", "R1", "V", "earlier", "docs"])]),
  source_ids: z.string(),
  note: z.string(),
});

export const sourceRow = z
  .object({
    source_id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    title: nonEmpty,
    issuer: nonEmpty,
    portal_ids: z.string().regex(/^[a-z]{2}(;[a-z]{2})*$/),
    source_type: z.enum(["api_snapshot", "page_reading", "manual_screenshot", "documentation", "report"]),
    layer: z.enum(["S1", "S2", "R1", "V", "earlier", "docs"]),
    url: z.string(),
    url_status: z.enum(["recorded", "not_recorded", "internal_project_document"]),
    retrieved_at: z.string(),
    raw_file: z.string(),
    used_for: nonEmpty,
  })
  .refine((r) => (r.url_status === "recorded") === (r.url !== ""), "url and url_status disagree")
  .refine((r) => r.url === "" || /^https?:\/\//.test(r.url), "url must be http(s)");

export const publisherNameRow = z.object({
  org_name: nonEmpty,
  title_original: nonEmpty,
  title_en: nonEmpty,
  translation_method: z.enum(["translated", "transliterated", "abbreviation_expanded", "kept"]),
  needs_review: z.literal("false", { message: "a publisher name is still marked needs_review" }),
});

export const themeLabelRow = z.object({
  theme_code: z.union([themeCode, z.literal("NONE")]),
  theme_name: nonEmpty,
  short_label: nonEmpty,
});

export const countryNameRow = z.object({ country_code: nonEmpty, name: nonEmpty });

export const SCHEMAS = {
  "phase1/metrics.csv": metricRow,
  "phase1/validation_readings.csv": validationRow,
  "phase1/mk_format_shares.csv": formatShareRow,
  "phase1/mk_format_labels_raw.csv": formatLabelRow,
  "phase1/mk_themes.csv": themeRow,
  "phase1/theme_profile_mk_vs_eu.csv": themeProfileRow,
  "phase1/mk_publishers.csv": publisherRow,
  "phase1/eu_provenance.csv": provenanceRow,
  "reference/metrics_supplement.csv": metricRow,
  "reference/portals.csv": portalRow,
  "reference/access_matrix.csv": accessRow,
  "reference/sources.csv": sourceRow,
  "reference/mk_publisher_names_en.csv": publisherNameRow,
  "reference/theme_labels.csv": themeLabelRow,
  "reference/country_names.csv": countryNameRow,
} as const;

export type CsvName = keyof typeof SCHEMAS;
export const CSV_FILES = Object.keys(SCHEMAS) as CsvName[];
