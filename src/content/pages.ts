// Browser titles and one-sentence meta descriptions per page.
export const SITE_NAME = "OpenDataScope";

export const PAGES = {
  overview: {
    title: "OpenDataScope — Comparing Government Open Data Ecosystems",
    description:
      "A snapshot-based comparison of official open-data catalogues, with North Macedonia's data.gov.mk as the central case study.",
  },
  northMacedonia: {
    title: "North Macedonia deep dive · OpenDataScope",
    description: "What data.gov.mk holds, who publishes it, in which formats and under which licence metadata, from the research snapshot.",
  },
  compare: {
    title: "Compare portals · OpenDataScope",
    description: "Compare two to four national open-data portals side by side, with a comparability badge on every row.",
  },
  methodology: {
    title: "Methodology and sources · OpenDataScope",
    description: "How the research snapshot was collected, cleaned, validated and compared, with every source and downloadable data file.",
  },
  notFound: {
    title: "Page not found · OpenDataScope",
    description: "This page is not part of OpenDataScope.",
  },
} as const;

/** "{Portal name} · OpenDataScope", with the country so the tab is unambiguous, e.g. "United Kingdom: data.gov.uk · OpenDataScope". */
export function countryTitle(country: string, portalName: string): string {
  return `${country}: ${portalName} · ${SITE_NAME}`;
}
export function countryDescription(country: string, domain: string): string {
  return `${country}'s official open-data portal, ${domain}, as recorded in the OpenDataScope research snapshot.`;
}

/** North Macedonia page: anchors, navigation labels and headings in story order. */
export const NM_SECTIONS = [
  { id: "catalogue-overview", nav: "Catalogue overview", heading: "Catalogue overview" },
  { id: "publishers", nav: "Publishers", heading: "Who publishes?" },
  { id: "themes", nav: "Themes", heading: "What topics does the data cover?" },
  { id: "formats", nav: "Formats", heading: "In what formats?" },
  { id: "machine-readability", nav: "Machine readability", heading: "How machine-readable is it?" },
  { id: "licensing", nav: "Licensing", heading: "Is the licence stated?" },
  { id: "metadata-activity", nav: "Metadata activity", heading: "Metadata records modified in the last 12 months" },
  { id: "eu-discoverability", nav: "EU discoverability", heading: "Is North Macedonia visible on the EU portal?" },
  { id: "opportunities", nav: "Opportunities", heading: "Opportunities supported by the evidence" },
] as const;

export const NM_COPY = {
  h1: "North Macedonia: data.gov.mk",
  themesOverlapNote: "Counts overlap because datasets can have more than one theme.",
  publisherTableCaption: "Active publishers in the snapshot (ranked by datasets; ties share a rank)",
  rawLabelsSummary: "Show the raw format labels and the format each maps to",
  rawLabelsCaption: "Raw format labels on data.gov.mk resources",
  readConclusion: "Read the overall conclusion",
} as const;

/** Overview: anchors and headings. */
export const OVERVIEW_SECTIONS = {
  keyFacts: { id: "key-facts", heading: "North Macedonia at a glance" },
  size: { id: "catalogue-size", heading: "How large is each national catalogue?" },
  eu: { id: "eu-aggregator", heading: "The EU portal: an aggregator, not a country" },
  exists: { id: "what-data-exists", heading: "What data exists in North Macedonia?" },
  reuse: { id: "reusability", heading: "How reusable is the data?" },
  findings: { id: "key-findings", heading: "Key findings" },
  conclusion: { id: "conclusion", heading: "What the comparison shows" },
} as const;

export const OVERVIEW_COPY = {
  inShort: "In short",
  ctaPrimary: { label: "Explore North Macedonia", href: "/north-macedonia", variant: "primary" },
  ctaSecondary: { label: "Compare Portals", href: "/compare", variant: "secondary" },
  countingDiffers: "Counting differs",
  sizeLead: "Each portal counts a different unit, so the chart shows scale on a log axis, not equal amounts of data.",
  sizeReason: "Units differ: dataset, directory record, metadata record, register record.",
  reuseLead: "Seven access and reuse features per portal, each with its state, its evidence layer and how far it can be compared.",
  openComparison: "Open the full comparison",
  findingsLead: "Six findings from the snapshot, each linked to its evidence.",
  conclusionLead: "Seven statements answer the research question without ranking any portal.",
  euPageLink: "Open the European Union page",
  readMore: "Read more",
} as const;
