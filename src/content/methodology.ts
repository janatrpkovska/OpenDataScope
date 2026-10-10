// Methodology copy. Text follows the Phase 1 report, sections F1–F3 and the layer table; every
// statistic is a token rendered at build time ({v}, {d}, {t}, {r}), so nothing is typed. Process facts that
// exist only in the Phase 1 report (collector versions, call counts, screenshot count) are declared in
// PROCESS_FACTS with their source, so the number audit can show where they come from.

export const METHODOLOGY_SECTIONS = [
  { id: "research-question", nav: "Research question", heading: "Research question" },
  { id: "process", nav: "Data Science process", heading: "Data Science process" },
  { id: "data-sources", nav: "Data sources", heading: "Data sources" },
  { id: "collection", nav: "Data collection", heading: "Data collection" },
  { id: "snapshot", nav: "Snapshot methodology", heading: "Snapshot methodology" },
  { id: "cleaning", nav: "Data cleaning", heading: "Data cleaning" },
  { id: "format-normalisation", nav: "Format normalisation", heading: "Format normalisation" },
  { id: "theme-mapping", nav: "Theme mapping", heading: "Theme mapping" },
  { id: "derived-indicators", nav: "Derived indicators", heading: "Derived indicators" },
  { id: "comparability", nav: "Data limitations", heading: "Data and comparability limitations" },
  { id: "validation", nav: "Manual validation", heading: "Manual validation" },
  { id: "source-register", nav: "Source register", heading: "Source register" },
] as const;

/** Rendered at build time under "methodology.<key>" (token log and statement records). */
export const METHODOLOGY_TEMPLATES: Record<string, string> = {
  scope:
    "Seven national portals are compared: North Macedonia's data.gov.mk as the central case study, and the portals of the United Kingdom, the United States, Germany, France, the Netherlands and Spain. The EU portal, data.europa.eu, is shown separately because it aggregates national catalogues. Serbia appears as regional context only.",
  noRanking: "No ranking or composite score is produced.",
  step1: "What open government data exists in North Macedonia, how much, and how does it compare in quantity, type and reusability with the UK, US, EU portal, Germany, France, the Netherlands and Spain? Serbia is regional context only. No ranking is produced.",
  step2: "Official APIs first, then timed official page readings where no API total exists, then later screenshots for validation, then reports and documentation. Two collector runs (S1, S2) saved every response unchanged, including error bodies. Sites that disallow automated access were read by hand, never worked around.",
  step3: "Every raw file was opened, which surfaced the POST requirement for MK list endpoints, the UK organisation discrepancy, duplicate group objects in MK records, and the real MK theme field.",
  step4: "UTC timestamps with explicit local conversion. Resource formats normalised by a fixed map ({v:mk.format_labels_raw_resource_level} MK labels to {t:rowcount|mk_format_shares|rows} formats). Licence ids grouped into open / not specified / none. Publisher titles resolved through organization_show. Groups and themes counted as unique (dataset, value) pairs.",
  step5: "Missing means null with a status, never zero. Overlapping facets are reported as counts or as shares of datasets, never summed into shares of a total. Two official measurements of one quantity keep one as canonical and one as validation.",
  step6: "Publisher participation and concentration, resource formats, theme coverage, licence coverage, metadata activity, EU presence.",
  step7: "Cross-portal comparisons only where query and unit match: metadata activity, licence ids and dataset-level format presence (MK, UK, NL on CKAN); theme profile (MK vs EU portal, same EU vocabulary).",
  step8: "Charts state their finding in the title, show the unit and snapshot layer, and keep the EU aggregator apart.",
  step9: "Findings describe catalogue metadata and practice, not the quality of the underlying data, and make no political judgement.",
  step10: "Limitations are listed under data and comparability limitations, and every field that was not collected is labelled where it would appear.",
  hierarchy: "Evidence hierarchy: API snapshot → timed official page reading (only where no API total exists) → later screenshot (validation) → report or documentation.",
  verification: "Every S1 and S2 value was recomputed from the raw JSON in the two snapshot archives, not from the collectors' summaries.",
  serbia: "Serbia: S2 retrieved the same values as an earlier page read of the same API, so S2 is canonical for Serbia too.",
  mixing: "Values from different layers are combined only where stated. The one cross-layer comparison is metadata activity: North Macedonia and the United Kingdom come from S1 and the Netherlands from S2.",
  canonicalVsValidation:
    "Canonical values come only from the S1, S2 and R1 layers. Later readings (V) and earlier readings are validation evidence: they show normal catalogue drift and never replace a canonical value.",
  cleanUtc: "All timestamps are stored in UTC, with an explicit conversion to Europe/Skopje (UTC+2) where they are shown.",
  cleanTitles: "Publisher titles were resolved through organization_show. English names are reference translations; the Macedonian original is kept beside each one.",
  cleanPairs:
    "Groups and themes are counted as unique (dataset, value) pairs. The MK records held 8 raw group occurrences, which reduce to {v:mk.datasets_in_assigned_groups} unique pairs; the build uses the pairs.",
  cleanNull: "Missing means null with a status, never zero. A verified zero (North Macedonia on data.europa.eu) is printed with its evidence.",
  cleanLicence: "Licence identifiers are grouped into an open-licence identifier, 'not specified' and none.",
  formatsLead: "{v:mk.format_labels_raw_resource_level} raw format labels on North Macedonian resources map to {t:rowcount|mk_format_shares|rows} normalised formats; {t:mk_format_shares|(empty)|resource_count} resources carry no format.",
  themesLead:
    "North Macedonia and the EU portal use the same EU data-theme vocabulary, listed below. The other national portals use their own schemes, which are not mapped in this release.",
  derivedLead:
    "Every derived value is computed at build time from the frozen tables by the formula shown. Project-defined indicators follow a project rule and are not official ratings or quality scores.",
  check1: "{v:mk.datasets_crawled} = {v:mk.datasets_total} ✓",
  check2: "{v:mk.datasets_total} ✓; {v:mk.publishers_active} = {v:mk.publishers_active} ✓",
  check3: "Identical ({v:mk.datasets_licence_not_specified} / {v:mk.datasets_no_licence_id} / {v:mk.licence_cc_zero} / {v:mk.licence_other_open} / {v:mk.licence_other_pd} / {v:mk.licence_cc_by}) ✓",
  check4: "{v:mk.resources_total} ✓; {v:mk.format_labels_raw_resource_level} / {v:mk.format_labels_raw_resource_level} ✓",
  check5: "None ✓",
  check6: "8 vs {v:mk.datasets_in_assigned_groups}: unique pairs used; the collector v2.0 derived file was corrected",
  check7: "All identical ✓",
  check8: "Identical ✓",
  check9: "{v:uk.datasets_total} ✓",
  check10: "{v:nl.datasets_total} ✓",
  check11: "{r:de.v13|value} = {r:de.v12|value} + {r:de.v14|value} + {r:de.v15|value} ✓",
  check12: "Small in every case; the largest is Germany's {r:de.v12|diffpct} (see the drift table above)",
  check13:
    "Harvested copies are close to the national counts for the United Kingdom, Spain, France and Germany; the Netherlands copy ({v:nl.records_on_data_europa_eu_catalogue} records) is below the register ({v:nl.datasets_total}). The values are in the table below.",
  limit3: "Metadata activity: metadata_modified shows metadata changes, including those caused by re-harvesting; it does not prove the data itself was updated.",
  limit6: "The EU-portal theme profile is dominated by German records ({d:eu.largest_provenance_share}); it is a reference, not a benchmark.",
};

export const PROCESS_STEPS = [
  { n: 1, title: "Define the problem", key: "step1" },
  { n: 2, title: "Retrieve data", key: "step2" },
  { n: 3, title: "Inspect and understand", key: "step3" },
  { n: 4, title: "Clean and standardise", key: "step4" },
  { n: 5, title: "Handle missing and incomparable values", key: "step5" },
  { n: 6, title: "Explore", key: "step6" },
  { n: 7, title: "Compare", key: "step7" },
  { n: 8, title: "Visualise", key: "step8" },
  { n: 9, title: "Interpret", key: "step9" },
  { n: 10, title: "Document limitations", key: "step10" },
] as const;

/** The collection layers (Phase 1 report, opening layer table). Times come from the data. */
export const LAYERS = [
  { id: "S1", what: "Collector v1: North Macedonia, United Kingdom, United States, France and EU portal APIs (14 calls)", role: "Canonical" },
  { id: "S2", what: "Collector v2.0: full North Macedonia crawl, North Macedonia lists via POST, Netherlands API, Serbia API, GovData reading entered at the start (91 manifest rows, 0 errors)", role: "Canonical" },
  { id: "R1", what: "Official page reading of the Spain homepage (no API total exists)", role: "Canonical for Spain only" },
  { id: "V", what: "Manual screenshots of 11 official pages", role: "Validation only" },
  { id: "earlier", what: "Values from earlier drafts of the Phase 1 report", role: "Validation only (superseded)" },
  { id: "docs", what: "API documentation, GDS blog, ODM 2025 report and factsheets", role: "Structural and historical evidence" },
] as const;

/** Numbers that exist only in the Phase 1 report (not in any CSV), with where they come from. */
export const PROCESS_FACTS = [
  { value: 14, what: "S1 API calls", source: "P1-report", where: "Phase 1 report, layer table" },
  { value: 91, what: "S2 manifest rows", source: "P1-report", where: "Phase 1 report, layer table" },
  { value: 11, what: "official pages screenshotted for validation", source: "P1-report", where: "Phase 1 report, layer table" },
  { value: 8, what: "raw MK group occurrences before de-duplication", source: "P1-report", where: "Phase 1 report, F2 and C" },
] as const;

export const CHECKS = [
  { check: "MK crawl: unique records = result.count", key: "check1" },
  { check: "MK organisation facet sums to total; the crawl finds the same active publishers", key: "check2" },
  { check: "MK licence ids in the S1 facet = the S2 crawl", key: "check3" },
  { check: "MK resource formats sum; every raw label mapped once", key: "check4" },
  { check: "MK theme codes duplicated inside a record", key: "check5" },
  { check: "MK groups: raw occurrences vs unique pairs", key: "check6" },
  { check: "Every reported S2 value vs raw recomputation", key: "check7" },
  { check: "Serbia: earlier page read of the API vs S2 raw", key: "check8" },
  { check: "UK organisation facet sums to total", key: "check9" },
  { check: "NL licence facet sums to total (single-valued)", key: "check10" },
  { check: "DE all results = datasets + applications + information records (V)", key: "check11" },
  { check: "Drift, canonical vs later reading, core portals", key: "check12" },
  { check: "National counts vs harvested copies on the EU portal", key: "check13" },
] as const;

export const LIMITATIONS: { text?: string; key?: string }[] = [
  { text: "Dynamic totals: catalogue counts change continuously; the app shows the snapshot value with its timestamp and the later reading as validation, never as a correction." },
  { text: "Units differ: dataset, directory record, metadata record, register record and aggregated record are not interchangeable, and some portals include restricted or non-public records in their totals (see the count-definition table above)." },
  { text: "Classification systems differ: no cross-country theme mapping is used where a reliable taxonomy crosswalk is unavailable. Themes are compared only between North Macedonia and the EU portal, which use the same EU data-theme vocabulary." },
  { text: "Incomplete metadata: theme, licence and format fields are not filled in on every record. Records are counted as published, and the gaps are reported (for example datasets with no theme or no licence identifier), never filled in." },
  { key: "limit3" },
  { text: "Page readings (Spain, Germany) have no raw JSON; they carry a reading time instead." },
  { text: "Project indicators: machine-readable, open-format and local-government classifications follow project rules (see derived indicators), not official standards." },
  { key: "limit6" },
  { text: "ODM 2025 is self-reported and validated by its research team; it does not cover the United Kingdom or the United States." },
  { text: "Coverage gaps: fields that were not collected are labelled 'Not collected' wherever they would appear, never shown as zero." },
  { text: "EU aggregator: data.europa.eu re-counts records harvested from national and institutional catalogues. It is shown separately and is never ranked against national portals as if it were a country." },
  { text: "Serbia: shown as regional context only; it is not part of the core national comparison." },
];

export const METHODOLOGY_COPY = {
  h1: "Methodology and sources",
  lead: "How the research snapshot was collected, cleaned, validated and compared, with every source and every data file.",
  layerTable: "Collection layers",
  sourceCounts: "Sources by type",
  driftTable: "Drift between the canonical snapshot and later readings, core portals",
  mapTable: "Format normalisation map",
  themeTable: "EU data-theme codes used in North Macedonia",
  derivedTable: "Derived values (closed list)",
  countTable: "Count definitions",
  validationTable: "Validation register",
  checksTable: "Validation checks performed",
  harvestedTable: "National counts and harvested copies on the EU portal",
  sourcesTable: "Source register",
  downloads: "Download the data",
  downloadsLead: "The {n} tables behind every value, with their SHA-256 checksums. Phase 1 tables are frozen and verified before every build.",
  manifest: "Checksum manifest (manifest.json)",
} as const;
