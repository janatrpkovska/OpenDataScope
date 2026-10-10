// The closed list of derived values. A value not listed here cannot appear in the
// app, apart from a {pct} share of two listed counts. Each value carries its formula and inputs,
// shown by the source drawer and on the methodology page (§9).
import { round, share } from "./format";
import type { DerivedValue, EuProvenance, FormatMetric, Metric, PublisherMetric, ThemeMetric } from "./types";

export interface DeriveInput {
  metrics: Record<string, Metric>;
  formats: FormatMetric[];
  themes: ThemeMetric[];
  publishers: PublisherMetric[];
  euProvenance: EuProvenance[];
  nationalPortalIds: string[]; // portal_class = national
}

function num(metrics: Record<string, Metric>, id: string): number {
  const m = metrics[id];
  if (!m || typeof m.value !== "number") throw new Error(`derive: metric ${id} is missing or not numeric`);
  return m.value;
}

/** Ranks with ties kept (competition ranking): 68, 57, 52, 38, 33, 33, 26 → 1, 2, 3, 4, 5, 5, 7. */
export function competitionRanks(values: number[]): number[] {
  return values.map((v) => 1 + values.filter((x) => x > v).length);
}

/** C11 shows the top N active publishers with ties kept at the boundary. */
export const TOP_PUBLISHERS_N = 15;

export function topWithTies<T>(rows: T[], value: (r: T) => number, n: number): T[] {
  const sorted = [...rows].sort((a, b) => value(b) - value(a));
  if (sorted.length <= n) return sorted;
  const cutoff = value(sorted[n - 1]!);
  return sorted.filter((r, i) => i < n || value(r) === cutoff);
}

export function computeDerived(input: DeriveInput): Record<string, DerivedValue> {
  const { metrics, formats, themes, publishers, euProvenance } = input;
  const out: Record<string, DerivedValue> = {};
  const add = (
    id: string,
    value: number,
    unit: DerivedValue["unit"],
    decimals: DerivedValue["decimals"],
    formula: string,
    inputs: string[],
    projectDefined = false,
  ) => {
    if (out[id]) throw new Error(`derive: duplicate id ${id}`);
    if (metrics[id]) throw new Error(`derive: id ${id} collides with a metric id`);
    out[id] = { id, value: unit === "count" ? value : round(value, decimals), decimals, unit, formula, inputs, projectDefined };
  };

  const datasets = num(metrics, "mk.datasets_total");
  const resources = num(metrics, "mk.resources_total");
  const listed = num(metrics, "mk.organisations_listed");
  const active = num(metrics, "mk.publishers_active");

  add("mk.resources_per_dataset", resources / datasets, "ratio", 2, "resources_total ÷ datasets_total", ["mk.resources_total", "mk.datasets_total"]);
  add("mk.inactive_organisations", listed - active, "count", 0, "organisations_listed − publishers_active", ["mk.organisations_listed", "mk.publishers_active"]);
  add("mk.active_share", share(active, listed), "percent", 1, "publishers_active ÷ organisations_listed", ["mk.publishers_active", "mk.organisations_listed"]);
  add("mk.datasets_without_theme", datasets - num(metrics, "mk.datasets_with_theme"), "count", 0, "datasets_total − datasets_with_theme", ["mk.datasets_total", "mk.datasets_with_theme"]);
  add("mk.themes_used", themes.filter((t) => t.code !== "NONE" && t.datasets > 0).length, "count", 0, "theme codes with ≥ 1 dataset", ["mk_themes.csv"]);
  add("mk.tags_per_tagged_dataset", num(metrics, "mk.theme_assignments") / num(metrics, "mk.datasets_with_theme"), "ratio", 2, "theme_assignments ÷ datasets_with_theme", ["mk.theme_assignments", "mk.datasets_with_theme"]);

  const localListed = publishers.filter((p) => p.localGovernment).length;
  add("mk.local_gov_listed", localListed, "count", 0, "organisations whose title begins \"Општина\" or \"Град Скопје\" (title-prefix rule)", ["mk_publishers.csv"], true);
  add("mk.other_listed", listed - localListed, "count", 0, "organisations_listed − local_gov_listed", ["mk.organisations_listed", "derived.mk.local_gov_listed"], true);
  add("mk.other_active", active - num(metrics, "mk.active_local_government_publishers"), "count", 0, "publishers_active − active_local_government_publishers", ["mk.publishers_active", "mk.active_local_government_publishers"], true);
  add("mk.local_gov_dataset_share", share(num(metrics, "mk.datasets_from_local_government"), datasets), "percent", 1, "datasets_from_local_government ÷ datasets_total", ["mk.datasets_from_local_government", "mk.datasets_total"], true);

  const activePubs = publishers.filter((p) => p.active);
  const sortedCounts = activePubs.map((p) => p.datasets).sort((a, b) => b - a);
  const top5 = sortedCounts.slice(0, 5).reduce((s, v) => s + v, 0);
  add("mk.top5_datasets", top5, "count", 0, "sum of the 5 largest publishers' datasets", ["mk_publishers.csv"]);
  add("mk.top5_share", share(top5, datasets), "percent", 1, "top5_datasets ÷ datasets_total", ["derived.mk.top5_datasets", "mk.datasets_total"]);
  const top = topWithTies(activePubs, (p) => p.datasets, TOP_PUBLISHERS_N);
  const outside = activePubs.filter((p) => !top.includes(p));
  const outsideDatasets = outside.reduce((s, p) => s + p.datasets, 0);
  // C11's annotation prints the number of publishers outside the chart.
  add("mk.outside_top15_publishers", outside.length, "count", 0, "active publishers not drawn in C11 (top 15, ties kept)", ["mk_publishers.csv"]);
  add("mk.outside_top15_datasets", outsideDatasets, "count", 0, "datasets of the active publishers outside C11", ["mk_publishers.csv"]);
  add("mk.outside_top15_share", share(outsideDatasets, datasets), "percent", 1, "outside_top15_datasets ÷ datasets_total", ["derived.mk.outside_top15_datasets", "mk.datasets_total"]);

  const fmt = (f: string) => {
    const r = formats.find((x) => x.format === f);
    if (!r) throw new Error(`derive: format ${f} missing`);
    return r;
  };
  const spreadsheets = fmt("XLSX").resourceCount + fmt("XLS").resourceCount;
  add("mk.spreadsheet_resources", spreadsheets, "count", 0, "XLSX + XLS resources", ["mk_format_shares.csv"]);
  add("mk.spreadsheet_share", share(spreadsheets, resources), "percent", 1, "spreadsheet_resources ÷ resources_total", ["derived.mk.spreadsheet_resources", "mk.resources_total"]);
  add("mk.json_datasets_pct", share(fmt("JSON").datasetsOffering, datasets), "percent", 1, "datasets offering JSON ÷ datasets_total", ["mk_format_shares.csv", "mk.datasets_total"]);
  add("mk.csv_datasets_pct", share(fmt("CSV").datasetsOffering, datasets), "percent", 1, "datasets offering CSV ÷ datasets_total", ["mk_format_shares.csv", "mk.datasets_total"]);
  add("mk.not_machine_readable", resources - num(metrics, "mk.machine_readable_resources"), "count", 0, "resources_total − machine_readable_resources", ["mk.resources_total", "mk.machine_readable_resources"], true);
  add("mk.not_open_format", resources - num(metrics, "mk.open_format_resources"), "count", 0, "resources_total − open_format_resources", ["mk.resources_total", "mk.open_format_resources"], true);
  add("mk.no_open_licence", num(metrics, "mk.datasets_licence_not_specified") + num(metrics, "mk.datasets_no_licence_id"), "count", 0, "datasets_licence_not_specified + datasets_no_licence_id", ["mk.datasets_licence_not_specified", "mk.datasets_no_licence_id"]);
  add("nl.other_licence", num(metrics, "nl.datasets_total") - num(metrics, "nl.datasets_open_licence_id"), "count", 0, "datasets_total − datasets_open_licence_id", ["nl.datasets_total", "nl.datasets_open_licence_id"]);

  const others = input.nationalPortalIds.filter((p) => p !== "mk").map((p) => num(metrics, `${p}.datasets_total`));
  add("national.others_min", Math.min(...others), "count", 0, "min datasets_total of national portals other than MK", input.nationalPortalIds.filter((p) => p !== "mk").map((p) => `${p}.datasets_total`));
  add("national.others_max", Math.max(...others), "count", 0, "max datasets_total of national portals other than MK", input.nationalPortalIds.filter((p) => p !== "mk").map((p) => `${p}.datasets_total`));

  add("eu.provenance_values", euProvenance.filter((p) => p.records > 0).length, "count", 0, "provenance rows with records > 0", ["eu_provenance.csv"]);
  const de = euProvenance.find((p) => p.countryCode === "de");
  if (!de) throw new Error("derive: provenance de missing");
  add("eu.largest_provenance_share", share(de.records, num(metrics, "eu.datasets_total")), "percent", 1, "de ÷ eu.datasets_total", ["eu_provenance.csv", "eu.datasets_total"]);
  add("us.largest_publisher_share", share(num(metrics, "us.largest_publisher_records"), num(metrics, "us.datasets_total")), "percent", 1, "largest_publisher_records ÷ datasets_total", ["us.largest_publisher_records", "us.datasets_total"]);
  add("rs.largest_publisher_share", share(num(metrics, "rs.largest_publisher_datasets"), num(metrics, "rs.datasets_total")), "percent", 1, "largest_publisher_datasets ÷ datasets_total (regional context)", ["rs.largest_publisher_datasets", "rs.datasets_total"]);
  return out;
}
