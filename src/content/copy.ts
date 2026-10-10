// Fixed copy without statistics. Copy that carries numbers is in text.ts
// and is rendered through tokens.
export const AUTHOR_LINE = "Jana Trpkovska · FINKI · 2026";

export const CORE_RULE =
  "Open-data catalogue totals are dynamic measurements rather than fixed statistics. OpenDataScope therefore uses a timestamped research snapshot as its canonical analytical dataset. Later official-page readings are retained as validation evidence and demonstrate normal catalogue drift over time.";

export const LIVE_NOTE = "Live portals can change after the research snapshot.";

export const HERO = {
  title: "OpenDataScope",
  subtitle: "Comparing Government Open Data Ecosystems",
  description:
    "OpenDataScope compares the official open-data catalogues of North Macedonia, the United Kingdom, the United States, Germany, France, the Netherlands and Spain, and shows the EU portal separately. North Macedonia's portal, data.gov.mk, is the central case study.",
  question:
    "Research question: How does North Macedonia's open-data ecosystem compare with major European and international open-data portals?",
};

export const EU_STATEMENT =
  "data.europa.eu is an aggregator of national and institutional catalogues and should not be ranked directly against national portals.";

export const LICENSING_TEXT =
  "A licence identifier tells reusers, from the metadata alone, which terms apply. Where it is missing or 'not specified', reusers must check each dataset separately. This describes the metadata, not the legal status of the data.";

export const METADATA_ACTIVITY_TEXT =
  "metadata_modified reflects catalogue metadata activity and does not necessarily mean the underlying dataset itself changed. The same CKAN query was run on all three portals; North Macedonia and the United Kingdom in S1, the Netherlands in S2, about 42 minutes later.";

export const DCAT_TEXT =
  "The national portal has DCAT-related extensions installed (dcat, dcat_json_interface, mk_dcatap), but no North Macedonian records were present in the data.europa.eu snapshot. The snapshot does not show why.";

export const PUBLISHER_NEUTRAL_NOTE = "The snapshot does not record why a listed organisation has no public dataset.";

export const STATUS_WORDING: Record<string, string> = {
  verified_live: "Verified from the live API",
  verified_live_page: "Read from the official page at a recorded time",
  verified_manual: "Read by the researcher on the official page",
  derived: "Derived from verified values",
  verified_report: "From an official report",
};

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  api_snapshot: "API snapshot",
  page_reading: "Official page reading",
  manual_screenshot: "Manual screenshot (validation)",
  documentation: "Documentation",
  report: "Report",
};

export const LAYER_LABEL: Record<string, string> = {
  S1: "S1",
  S2: "S2",
  R1: "R1",
  V: "V (later reading)",
  earlier: "Earlier reading",
  docs: "Docs",
};

/** Theme limitation shown next to every thematic view that involves more than one portal. */
export const THEME_MAPPING_NOTE =
  "No cross-country theme mapping is used where a reliable taxonomy crosswalk is unavailable. North Macedonia is compared only with the EU portal, which uses the same EU data-theme vocabulary; the other national portals keep their own category schemes.";

/** Data-limitations summary (Methodology, Compare). Frames scope and uncertainty; no new facts. */
export const DATA_LIMITS_SUMMARY =
  "OpenDataScope uses official portal data and timestamped research snapshots. Portal counts and metadata may change after the snapshot, and different portals use different definitions and classification systems. Derived indicators are clearly labelled, and values that could not be verified or compared reliably are shown as unavailable rather than estimated.";
export const NO_ZERO_NO_ESTIMATE = "No missing value is interpreted as zero, and no unsupported value is estimated.";

export const COMPARABILITY = {
  direct: { word: "Direct", glyph: "=", long: "Directly comparable", meaning: "Same or closely comparable unit and query." },
  partial: { word: "Partial", glyph: "≈", long: "Partially comparable", meaning: "Similar idea, but definitions or units differ." },
  context_only: { word: "Context only", glyph: "i", long: "Not directly comparable", meaning: "Useful background, not quantitatively comparable." },
} as const;

export const MISSING = {
  not_reliably_available: { label: "Not reliably available", meaning: "The official source gives no reliable value." },
  not_collected: { label: "Not collected", meaning: "The value may exist, but Phase 1 did not collect it." },
  not_comparable: { label: "Not comparable", meaning: "A value exists but cannot sit in this comparison." },
  not_applicable: { label: "Not applicable", meaning: "The concept does not apply to this portal." },
} as const;

export const STATE_LABEL = {
  available: "Available",
  limited: "Limited",
  ...Object.fromEntries(Object.entries(MISSING).map(([k, v]) => [k, v.label])),
} as Record<string, string>;

export const RULES = {
  machine_readable:
    "Machine-readable (project rule): CSV, TSV, JSON, GeoJSON, XML, RDF/TTL/JSON-LD, XLS/XLSX/ODS, SHP, KML/GML and API or OGC services; not PDF, HTML, DOC/DOCX, images, ZIP or an empty format.",
  open_format: "Open format (project rule): machine-readable and non-proprietary, i.e. excluding XLS, XLSX and SHP.",
  local_government: "Local government (project rule): organisation titles beginning \"Општина\" (municipality) or \"Град Скопје\" (City of Skopje).",
} as const;

export const CLASS_LABEL = {
  national: "National portal",
  aggregator: "EU aggregator",
  regional_context: "Regional context",
} as const;

export const NAV = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "north-macedonia", label: "North Macedonia", href: "/north-macedonia" },
  { key: "compare", label: "Compare", href: "/compare" },
  { key: "portals", label: "Portals", href: null },
  { key: "methodology", label: "Methodology", href: "/methodology" },
] as const;
