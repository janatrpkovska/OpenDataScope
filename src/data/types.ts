// Data model used by the application.
// A missing value is always `null` plus a reason, never `0` or an empty string.

// ---------- enumerations ----------
export type PortalId = "mk" | "uk" | "us" | "de" | "fr" | "nl" | "es" | "eu" | "rs";
export type PortalClass = "national" | "aggregator" | "regional_context";
export type CanonicalLayer = "S1" | "S2" | "R1";
export type SnapshotLayer = CanonicalLayer | "V" | "earlier" | "docs";
export type MetricStatus = "verified_live" | "verified_live_page" | "verified_manual" | "derived" | "verified_report";
export type MetricRole = "headline" | "detail" | "context" | "validation";
export type IncludesNonOpen = "yes" | "no" | "unknown";

/** DIRECT / PARTIAL / CONTEXT ONLY (section L) */
export type ComparabilityStatus = "direct" | "partial" | "context_only";

/** Why a value is absent (section O). Never rendered as 0. */
export type MissingReason = "not_reliably_available" | "not_collected" | "not_comparable" | "not_applicable";

/** State of a capability cell in the access matrix */
export type CapabilityState = "available" | "limited" | MissingReason;

export type FeatureId =
  | "api"
  | "formats"
  | "metadata_standard"
  | "licensing"
  | "hvd"
  | "publishers"
  | "metadata_activity"
  | "themes";

export type ThemeCode =
  | "AGRI" | "ECON" | "EDUC" | "ENER" | "ENVI" | "GOVE" | "HEAL"
  | "INTR" | "JUST" | "REGI" | "SOCI" | "TECH" | "TRAN";

export type FormatClass = "open_machine_readable" | "machine_readable_proprietary" | "not_machine_readable" | "no_format";

export type RuleId = "machine_readable" | "open_format" | "local_government";

export type UrlStatus = "recorded" | "not_recorded" | "internal_project_document";

// ---------- core records ----------
export interface Portal {
  id: PortalId;
  slug: string;
  country: string;
  portalName: string;
  domain: string;
  displayName: string;
  portalClass: PortalClass;
  isReference: boolean;
  url: string;
  platform: string | null;
  portalType: string;
  headlineMetricId: string;
  unitLabel: string;
  unitNote: string;
  includesNonOpen: IncludesNonOpen;
  colorToken: string;
  displayOrder: number;
}

export interface Metric {
  id: string; // `${portalId}.${metric}`
  portalId: PortalId;
  metric: string;
  value: number | string | null; // string only for 'mk.ckan_version'
  missingReason: MissingReason | null; // required when value is null
  unit: string;
  countDefinition: string;
  comparabilityNote: string;
  includesNonOpen: IncludesNonOpen;
  status: MetricStatus;
  role: MetricRole;
  snapshotId: CanonicalLayer;
  sourceUrl: string;
  sourceId: string;
  retrievedAtUtc: { start: string; end: string | null };
  retrievedAtLocal: string;
  rawSnapshot: string | null;
  extractionMethod: string;
  origin: "metrics" | "metrics_supplement";
}

export interface ValidationReading {
  id: string; // `${portalId}.v${row}`
  portalId: PortalId;
  metric: string;
  visibleValue: string;
  visibleNumber: number | null;
  sourcePage: string;
  readingTime: string;
  layer: "V" | "earlier" | "earlier (R1)";
  role: "validation";
  canonicalValue: number | null;
  difference: number | null;
  differencePct: number | null;
  note: string;
  canonicalMetricId: string | null;
  sourceId: string | null; // resolved to sources.csv (V or earlier row) where the page matches
}

export interface SourceRecord {
  id: string;
  title: string;
  issuer: string;
  portalIds: PortalId[];
  sourceType: "api_snapshot" | "page_reading" | "manual_screenshot" | "documentation" | "report";
  layer: SnapshotLayer;
  url: string | null;
  urlStatus: UrlStatus; // not_recorded only when a source genuinely has no URL
  retrievedAt: string | null;
  rawFile: string | null;
  usedFor: string;
}

export interface ThemeMetric {
  code: ThemeCode | "NONE";
  name: string;
  shortLabel: string;
  datasets: number;
  shareOfDatasetsPct: number;
  snapshotId: "S2";
}

export interface ThemeProfileRow {
  code: ThemeCode;
  name: string;
  shortLabel: string;
  mkDatasets: number;
  mkPctOfDatasets: number;
  mkPctOfAssignments: number;
  euRecords: number;
  euPctOfAssignments: number;
  mkToEuRatio: number;
}

export interface FormatMetric {
  format: string;
  label: string;
  resourceCount: number;
  shareOfResourcesPct: number;
  datasetsOffering: number;
  shareOfDatasetsPct: number;
  machineReadable: boolean;
  openFormat: boolean;
  formatClass: FormatClass;
  rawLabels: { raw: string; count: number }[];
  snapshotId: "S2";
}

export interface RawFormatLabel {
  raw: string;
  normalised: string;
  count: number;
}

export interface PublisherMetric {
  orgName: string;
  titleOriginal: string;
  titleEn: string | null;
  translationMethod: "translated" | "transliterated" | "abbreviation_expanded" | "kept" | null;
  localGovernment: boolean;
  datasets: number;
  sharePct: number;
  active: boolean;
  rank: number | null; // competition rank among active publishers: 1, 2, 3, 4, 5, 5, 7 …
  snapshotId: "S2";
}

export interface AccessCapability {
  portalId: PortalId;
  feature: FeatureId;
  state: CapabilityState;
  displayValue: string; // template with tokens, as stored in access_matrix.csv
  display: string; // rendered text (tokens resolved at build time)
  metricIds: string[];
  comparability: ComparabilityStatus | null;
  comparabilityReason: string;
  layer: SnapshotLayer | null;
  sourceIds: string[];
  note: string;
}

export interface EuProvenance {
  countryCode: string;
  label: string;
  records: number;
  snapshotId: "S1";
}

// ---------- resolved view models ----------
export interface ResolvedMetric extends Metric {
  display: string;
  validation: ValidationReading[];
  source: SourceRecord;
}

export interface DerivedValue {
  id: string; // 'mk.spreadsheet_share'; written 'derived.mk.spreadsheet_share' in mixed id lists
  value: number;
  decimals: 0 | 1 | 2;
  unit: "count" | "percent" | "ratio";
  formula: string;
  inputs: string[];
  projectDefined: boolean;
}

export type DimensionId =
  | "size"
  | "publishers"
  | "portal_type"
  | "api"
  | "formats"
  | "licensing"
  | "metadata_standard"
  | "hvd"
  | "metadata_activity"
  | "count_definition";

export interface CompareCell {
  portalId: PortalId;
  state: CapabilityState;
  display: string;
  secondary: string | null;
  status: ComparabilityStatus | null;
  metricIds: string[];
  sourceIds: string[];
  /** The record "View source" opens for this cell (additive). */
  target: SourceTarget;
  layer: SnapshotLayer | null;
}

export interface CompareRow {
  id: DimensionId;
  label: string;
  why: string;
  cells: Partial<Record<PortalId, CompareCell>>;
}

export interface CompareSelection {
  national: PortalId[];
  includeEu: boolean;
  includeRs: boolean;
}

export interface SnapshotInfo {
  startUtc: string;
  endUtc: string;
  label: string;
  shortLabel: string;
  localLabel: string;
  validationLabel: string;
}

export interface ContentItem {
  id: string;
  template: string;
  status: ComparabilityStatus | null;
  href: string;
  title?: string;
  section?: string;
}

// ---------- helper types used in component props (section H) ----------
export type NavKey = "overview" | "north-macedonia" | "compare" | "portals" | "methodology";
export type ChartId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9" | "C10" | "C11" | "C12" | "C13";
export interface Cta {
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

export type SourceTarget =
  | { metricId: string }
  | { sourceId: string }
  | { readingId: string }
  | { derivedId: string }
  | { cell: { portalId: PortalId; feature: FeatureId } }
  /** A rendered sentence or chart: every value in it with its inputs (tokenLog), e.g. "text.nmLead", "chart.C2". */
  | { statement: string };

export type Row = Record<string, string | number | null>;
export interface Column {
  key: string;
  header: string;
  align?: "left" | "right";
  format?: "int" | "pct1" | "pct2" | "text";
  /** Language of the cell text when it is not English (Macedonian originals: "mk"). */
  lang?: string;
  /** The column that names the row (rendered as the row header); defaults to the first column. */
  primary?: boolean;
}
export interface TableSpec {
  caption: string;
  columns: Column[];
  rows: Row[];
}

export interface SizeRow {
  portalId: PortalId;
  label: string;
  value: number | null;
  missingReason: MissingReason | null;
  unitLabel: string;
  metricId: string;
  definition: string;
  layerTime: string;
  comparabilityNote: string;
  validation: string | null;
  isReference: boolean;
}

export interface BarRow {
  key: string;
  label: string;
  secondaryLabel?: string;
  value: number;
  share: number | null;
  colorKey: string;
  metricId?: string;
  valueLabel: string;
  tooltip: { label: string; value: string }[];
}

export interface SeriesSpec {
  key: "a" | "b";
  label: string;
  colorKey: string;
}
export interface PairedRow {
  key: string;
  label: string;
  a: number;
  b: number;
  tooltip: { label: string; value: string }[];
}

export interface ShareSegment {
  key: string;
  label: string;
  value: number;
  colorKey: string;
  outlined?: boolean;
  /** Share of the row total, computed at build time from the counts: 1 decimal, 2 for C6/C7. */
  shareLabel?: string;
  /** "n / N = share" to 2 decimals, used in tooltips. */
  fraction?: string;
}
export interface ShareRow {
  key: string;
  label: string;
  total: number;
  segments: ShareSegment[];
}

export interface PercentRow {
  portalId: PortalId;
  label: string;
  numerator: number;
  denominator: number;
  metricIds: string[];
  pct: number;
}

export interface ContextRow {
  measure: string;
  mk: string;
  rs: string;
  note: string;
  status: ComparabilityStatus | null;
  /** Records behind each side's value (additive; opened by "View source"). */
  mkTarget?: SourceTarget;
  rsTarget?: SourceTarget;
}

export interface RenderedFinding {
  id: string;
  n: number;
  text: string;
  status: ComparabilityStatus | null;
  href: string;
  metricIds: string[];
}
export type RenderedStatement = RenderedFinding;
export type RenderedOpportunity = RenderedFinding & { title: string; section: string };

export interface DownloadFile {
  path: string;
  rows: number;
  bytes: number;
  sha256: string;
  origin: "phase1" | "reference";
}

/** One chart's complete, build-time view model (section F). */
export interface ChartModel {
  id: ChartId;
  title: string;
  subtitle: string;
  status: ComparabilityStatus | null;
  statusNote: string | null;
  projectIndicator: RuleId | null;
  annotation: string | null;
  note: string | null;
  sourceLine: string;
  sourceTarget: SourceTarget;
  summary: string;
  table: TableSpec;
  metricIds: string[];
}

export interface Bundle {
  snapshot: SnapshotInfo;
  portals: Portal[];
  metrics: Record<string, Metric>;
  validation: ValidationReading[];
  sources: SourceRecord[];
  themes: ThemeMetric[];
  themeProfile: ThemeProfileRow[];
  formats: FormatMetric[];
  formatLabelsRaw: RawFormatLabel[];
  publishers: PublisherMetric[];
  euProvenance: EuProvenance[];
  countryNames: Record<string, string>;
  access: AccessCapability[];
  derived: Record<string, DerivedValue>;
  content: RenderedContent;
  charts: ChartBundle;
  downloads: DownloadFile[];
  tokenLog: TokenLogEntry[];
}

export interface TokenLogEntry {
  where: string;
  token: string;
  rendered: string;
  inputs: string[];
}

export interface RenderedContent {
  summary: RenderedFinding;
  findings: RenderedFinding[];
  conclusion: RenderedStatement[];
  opportunities: RenderedOpportunity[];
  text: Record<string, string>; // fixed copy that carries tokens (tooltips, lead sentences)
  methodology: Record<string, string>; // methodology copy rendered through tokens
}

// Chart view models (data + copy) built once at build time.
export interface ChartBundle {
  C1: ChartModel & { rows: SizeRow[] };
  C2: ChartModel & { rows: ShareRow[] };
  C3: ChartModel & { rows: BarRow[] };
  C4: ChartModel & { rows: PairedRow[]; series: [SeriesSpec, SeriesSpec] };
  C5: ChartModel & { rows: BarRow[] };
  C6: ChartModel & { rows: ShareRow[] };
  C7: ChartModel & { rows: ShareRow[] };
  C8: ChartModel & { rows: ShareRow[] };
  C9: ChartModel & { rows: PercentRow[] };
  C10: ChartModel & { rows: ShareRow[] };
  C11: ChartModel & { rows: BarRow[] };
  C12: ChartModel & { rows: BarRow[] };
  C13: ChartModel & { rows: BarRow[] };
}
