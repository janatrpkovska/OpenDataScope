// Compare page copy. No statistics.
import type { DimensionId } from "@/data/types";

export const COMPARE_ROWS: { id: DimensionId; label: string; why: string }[] = [
  { id: "size", label: "Catalogue size", why: "Each portal counts a different unit: datasets, directory records, metadata records or register records. The values show scale, not equal amounts of data." },
  { id: "publishers", label: "Publishers / organisations", why: "Active-publisher counts use close but not identical definitions. France and Serbia report registered organisations, the Netherlands source catalogues, and the EU portal provenance values." },
  { id: "portal_type", label: "Portal type", why: "Descriptive: explains what each catalogue is." },
  { id: "api", label: "API availability", why: "Whether a public metadata API exists is the same yes/no question everywhere; API types differ." },
  { id: "formats", label: "Machine-readable formats", why: "Share of records offering at least one JSON or CSV resource: the same dataset-level measure in North Macedonia and the Netherlands." },
  { id: "licensing", label: "Licensing", why: "Same CKAN license_id field in North Macedonia and the Netherlands; the UK figure counts any licence id." },
  { id: "metadata_standard", label: "Metadata standard", why: "Standards are named, not measured." },
  { id: "hvd", label: "HVD support", why: "EU High-Value Datasets rules apply only within the EU, and the counts use different units." },
  { id: "metadata_activity", label: "Metadata activity", why: "Same CKAN metadata_modified query on three portals. It measures metadata changes, not data updates." },
  { id: "count_definition", label: "Count definition", why: "Read this row before comparing any number above." },
];

export const COMPARE_COPY = {
  h1: "Compare portals",
  lead: "Choose two to four national portals. Each row shows whether its values can be compared directly.",
  limitsNote:
    "National portals use different definitions and classification systems, so every comparison is marked Direct, Partial or Context only. Select “Why?” on a row, or a badge, for the reason.",
  legend: "National portals (choose two to four)",
  addEu: "Add EU aggregator column",
  addRs: "Add regional context: Serbia",
  tableHeading: "Side-by-side comparison",
  sizeHeading: "Catalogue size of the selected portals",
  sizeNote: "The EU aggregator and Serbia are never drawn on this axis.",
  howHeading: "How to read this comparison",
  notComparable: "Not comparable in this selection",
  resetNotice: "Selection reset to the default.",
  maxNotice: "Up to four national portals can be compared.",
  toggleNotice: "The EU and Serbia columns accept only 0 or 1; the default (off) is used.",
  dismiss: "Dismiss",
  emptyTitle: "Select at least two national portals.",
  emptyBody: "The comparison needs two to four national portals. Use the portal chips above.",
  why: "Why?",
  howTo: [
    "Units differ: each portal counts datasets, directory records, metadata records or register records, so read the count-definition row before comparing numbers.",
    "The EU portal re-counts records harvested from national and institutional catalogues; its total overlaps national totals and is never ranked with them.",
    "Serbia is regional context only and is not part of the core comparison.",
    "Themes are not compared across national portals: no cross-country theme mapping is used where a reliable taxonomy crosswalk is unavailable.",
  ],
} as const;
