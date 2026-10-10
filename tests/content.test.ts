// Content checks: rendered copy matches the expected project copy,
// and no template types a statistic outside a data token.
// The expected strings below are test fixtures, not application content.
import { describe, expect, it } from "vitest";
import { data, text } from "@/data";
import { CORE_RULE, DCAT_TEXT, EU_STATEMENT, HERO, LICENSING_TEXT, METADATA_ACTIVITY_TEXT, PUBLISHER_NEUTRAL_NOTE } from "@/content/copy";
import { TEXT_TEMPLATES } from "@/content/text";
import { FINDINGS } from "@/content/findings";
import { CONCLUSION } from "@/content/conclusion";
import { OPPORTUNITIES } from "@/content/opportunities";
import { METHODOLOGY_TEMPLATES } from "@/content/methodology";
import { COMPARE_ROWS } from "@/content/compare";
import { PAGES } from "@/content/pages";
import { TOKEN_RE } from "@/data/tokens";

const n = (s: string) => s.replace(/ /g, " ");

const EXPECTED_SUMMARY =
  "North Macedonia's portal lists 768 datasets with 1,605 resources from 62 active publishers. The other national portals list 20,791 to 590,168 records, counted in different units. 85.0 % of North Macedonian datasets carry a theme and 90.8 % of resources are machine-readable under the project rule. However, 33.5 % use open formats, 22.3 % of datasets carry an open-licence identifier and none appear on data.europa.eu.";

const SPEC_E6 = [
  ["North Macedonia's portal lists 768 datasets. The six other national portals list between 20,791 and 590,168 records, counted in different units.", "partial", "#catalogue-size"],
  ["85.0 % of North Macedonian datasets carry at least one EU data-theme code. Government (312 datasets) and economy (171) are the largest themes.", null, "/north-macedonia#themes"],
  ["Spreadsheets dominate: XLSX and XLS make up 57.3 % of the 1,605 resources, and JSON appears in 7.", null, "/north-macedonia#formats"],
  ["22.3 % of North Macedonian datasets carry an open-licence identifier, against 89.6 % in the Dutch register on the same CKAN field.", "direct", "/north-macedonia#licensing"],
  ["33.6 % of North Macedonian records had their metadata modified in the last 12 months, against 53.0 % in the UK and 81.7 % in the Netherlands on the same query.", "direct", "/north-macedonia#metadata-activity"],
  ["No North Macedonian records appeared on data.europa.eu in the snapshot, while the regional examples Serbia (3,527), Montenegro (917) and Albania (153) did.", "direct", "/north-macedonia#eu-discoverability"],
] as const;

const SPEC_E7 = [
  "North Macedonia has a much smaller catalogue than the other national portals: 768 datasets against 20,791 to 590,168 records.",
  "Dataset volume alone does not determine open-data maturity. Larger totals also count directory, register, restricted or non-public records, so units differ.",
  "Machine-readable coverage is high under the project definition: 90.8 % of resources.",
  "Spreadsheet formats dominate (57.3 % XLSX and XLS); open formats are 33.5 % of resources.",
  "Theme coverage is broad but incomplete: 13 themes are used and 15.0 % of datasets carry none.",
  "Licence metadata (22.3 % open-licence identifiers) and EU discoverability (0 records) are the clearest opportunities.",
  "Portal definitions and counting practices differ internationally, so OpenDataScope compares portals only where units and queries match.",
];

const SPEC_E8 = [
  ["Complete licence metadata", "597 of 768 datasets (77.7 %) have no open-licence identifier", "F"],
  ["Offer more web-ready formats such as JSON", "JSON in 7 of 1,605 resources; no GeoJSON label among the 19 raw labels", "D"],
  ["Improve visibility on the EU aggregator", "0 records on data.europa.eu", "H"],
  ["Broaden publisher participation", "70 of 132 listed organisations have no public dataset; 18 of 72 local-government bodies publish", "B"],
  ["Classify the remaining datasets by theme", "115 datasets (15.0 %) have no theme", "C"],
  ["Standardise format labels", "19 free-text labels; 45 resources have no format", "D"],
  ["Review catalogue metadata regularly", "33.6 % of records had metadata modified in the last 12 months (UK 53.0 %, NL 81.7 % on the same query)", "G"],
] as const;

describe("rendered copy matches expected project copy", () => {
  it("A: the 30-second answer", () => {
    expect(n(data.content.summary.text)).toBe(EXPECTED_SUMMARY);
  });
  it("E6: six key findings with badges and links", () => {
    expect(data.content.findings.map((f) => [n(f.text), f.status, f.href])).toEqual(SPEC_E6.map((x) => [...x]));
  });
  it("E7: seven conclusion statements", () => {
    expect(data.content.conclusion.map((c) => n(c.text))).toEqual(SPEC_E7);
  });
  it("E8: seven opportunities with evidence and section", () => {
    expect(data.content.opportunities.map((o) => [o.title, n(o.text), o.section])).toEqual(SPEC_E8.map((x) => [...x]));
  });
  it("E1 fixed copy and generated tooltip", () => {
    expect(HERO.description).toBe(
      "OpenDataScope compares the official open-data catalogues of North Macedonia, the United Kingdom, the United States, Germany, France, the Netherlands and Spain, and shows the EU portal separately. North Macedonia's portal, data.gov.mk, is the central case study.",
    );
    expect(HERO.question).toBe("Research question: How does North Macedonia's open-data ecosystem compare with major European and international open-data portals?");
    expect(n(text("activePublishersTooltip"))).toBe("132 organisations are listed on data.gov.mk. 62 of them owned at least one public dataset in the snapshot; the other 70 had none.");
    expect(EU_STATEMENT).toBe("data.europa.eu is an aggregator of national and institutional catalogues and should not be ranked directly against national portals.");
    expect(n(text("localGovLine"))).toBe("Local-government bodies publish 420 of the 768 datasets (54.7 %).");
    expect(CORE_RULE).toBe(
      "Open-data catalogue totals are dynamic measurements rather than fixed statistics. OpenDataScope therefore uses a timestamped research snapshot as its canonical analytical dataset. Later official-page readings are retained as validation evidence and demonstrate normal catalogue drift over time.",
    );
  });
  it("E2 fixed copy and generated lines", () => {
    expect(LICENSING_TEXT).toBe(
      "A licence identifier tells reusers, from the metadata alone, which terms apply. Where it is missing or 'not specified', reusers must check each dataset separately. This describes the metadata, not the legal status of the data.",
    );
    expect(METADATA_ACTIVITY_TEXT).toBe(
      "metadata_modified reflects catalogue metadata activity and does not necessarily mean the underlying dataset itself changed. The same CKAN query was run on all three portals; North Macedonia and the United Kingdom in S1, the Netherlands in S2, about 42 minutes later.",
    );
    expect(DCAT_TEXT).toBe(
      "The national portal has DCAT-related extensions installed (dcat, dcat_json_interface, mk_dcatap), but no North Macedonian records were present in the data.europa.eu snapshot. The snapshot does not show why.",
    );
    expect(PUBLISHER_NEUTRAL_NOTE).toBe("The snapshot does not record why a listed organisation has no public dataset.");
    expect(n(text("nmLead"))).toBe("data.gov.mk holds 768 public datasets with 1,605 resources from 62 active publishers.");
    expect(n(text("concentrationLine"))).toBe("The five largest publishers hold 248 datasets (32.3 %).");
    expect(n(text("datasetFormatLine"))).toBe("452 datasets (58.9 %) offer CSV; 7 (0.9 %) offer JSON.");
    expect(n(text("nlJsonComparison"))).toBe("Netherlands: JSON in 45.6 % of records (same dataset-level measure).");
    expect(n(text("mrDatasetsLine"))).toBe("697 datasets (90.8 %) offer at least one machine-readable resource.");
    expect(n(text("licenceBreakdown"))).toBe("Open-licence identifiers: CC0 116 · other open 39 · other public domain 12 · CC-BY 4");
    expect(n(text("groupsNote"))).toBe("CKAN groups are a separate mechanism: 9 listed, 1 used by 4 datasets.");
    expect(n(text("euZeroEvidence"))).toBe("0 records: North Macedonia is absent from the complete 38-value provenance facet.");
  });
  it("L3: the ten 'Why?' tooltips", () => {
    expect(COMPARE_ROWS.map((r) => r.why)).toEqual([
      "Each portal counts a different unit: datasets, directory records, metadata records or register records. The values show scale, not equal amounts of data.",
      "Active-publisher counts use close but not identical definitions. France and Serbia report registered organisations, the Netherlands source catalogues, and the EU portal provenance values.",
      "Descriptive: explains what each catalogue is.",
      "Whether a public metadata API exists is the same yes/no question everywhere; API types differ.",
      "Share of records offering at least one JSON or CSV resource: the same dataset-level measure in North Macedonia and the Netherlands.",
      "Same CKAN license_id field in North Macedonia and the Netherlands; the UK figure counts any licence id.",
      "Standards are named, not measured.",
      "EU High-Value Datasets rules apply only within the EU, and the counts use different units.",
      "Same CKAN metadata_modified query on three portals. It measures metadata changes, not data updates.",
      "Read this row before comparing any number above.",
    ]);
  });
  it("C: browser titles", () => {
    expect(PAGES.overview.title).toBe("OpenDataScope — Comparing Government Open Data Ecosystems");
    expect(PAGES.northMacedonia.title).toBe("North Macedonia deep dive · OpenDataScope");
    expect(PAGES.compare.title).toBe("Compare portals · OpenDataScope");
    expect(PAGES.methodology.title).toBe("Methodology and sources · OpenDataScope");
    expect(PAGES.notFound.title).toBe("Page not found · OpenDataScope");
  });
});

describe("no statistic is typed outside a token", () => {
  // Numbers allowed as plain text in templates: snapshot layer names (S1, S2, R1), the "12 months" window that
  // names a metric, the "≥ 1" theme threshold, the licence name CC0, the UTC+2 time zone, collector versions,
  // and the declared Phase 1 process fact "8 raw group occurrences".
  const ALLOWED = [/\bS[12]\b/g, /\bR1\b/g, /\b12 months\b/g, /≥ 1\b/g, /\bCC0\b/g, /UTC\+2/g, /\bv2\.0\b/g, /\b8 raw group occurrences\b/g, /^8 vs /g, /\b42 minutes\b/g];
  const templates: [string, string][] = [
    ...Object.entries(TEXT_TEMPLATES).map(([k, v]) => [`text.${k}`, v] as [string, string]),
    ...FINDINGS.map((f) => [`findings.${f.id}`, f.template] as [string, string]),
    ...CONCLUSION.map((f) => [`conclusion.${f.id}`, f.template] as [string, string]),
    ...OPPORTUNITIES.map((f) => [`opportunities.${f.id}`, f.template] as [string, string]),
    ...Object.entries(METHODOLOGY_TEMPLATES).map(([k, v]) => [`methodology.${k}`, v] as [string, string]),
  ];
  it.each(templates)("%s", (_where, tpl) => {
    let rest = tpl.replace(TOKEN_RE, " ");
    for (const re of ALLOWED) rest = rest.replace(re, " ");
    expect(rest.match(/\d+/g) ?? []).toEqual([]);
  });
});

// The methodological limitations are visible inside the application.
describe("methodological limitations visible in the app", () => {
  it("Compare carries the definitions/classification note and the Direct / Partial / Context only explanation", async () => {
    const { COMPARE_COPY } = await import("@/content/compare");
    expect(COMPARE_COPY.limitsNote).toMatch(/different definitions and classification systems/);
    expect(COMPARE_COPY.limitsNote).toMatch(/Direct, Partial or Context only/);
    expect(COMPARE_COPY.howTo.join(" ")).toMatch(/no cross-country theme mapping is used where a reliable taxonomy crosswalk is unavailable/);
    for (const r of COMPARE_ROWS) expect(r.why.length).toBeGreaterThan(10);
  });
  it("the Methodology limitations cover every required point", async () => {
    const { LIMITATIONS, METHODOLOGY_SECTIONS } = await import("@/content/methodology");
    const { DATA_LIMITS_SUMMARY, NO_ZERO_NO_ESTIMATE, THEME_MAPPING_NOTE } = await import("@/content/copy");
    expect(METHODOLOGY_SECTIONS.find((s) => s.id === "comparability")?.heading).toBe("Data and comparability limitations");
    const all = [DATA_LIMITS_SUMMARY, NO_ZERO_NO_ESTIMATE, ...LIMITATIONS.map((l) => l.text ?? METHODOLOGY_TEMPLATES[l.key!] ?? "")].join(" ");
    for (const re of [
      /may change after the snapshot/, /different definitions/, /directory record/, /metadata record/, /restricted or non-public/,
      /classification systems/, /crosswalk/, /Incomplete metadata/, /never shown as zero/, /No missing value is interpreted as zero/,
      /no unsupported value is estimated/, /Project indicators/, /later reading as validation/, /does not prove the data itself was updated/,
      /never ranked against national portals as if it were a country/, /Serbia: shown as regional context only/,
    ])
      expect(all).toMatch(re);
    expect(all).not.toMatch(/false information/i);
    expect(THEME_MAPPING_NOTE).toMatch(/same EU data-theme vocabulary/);
  });
});
