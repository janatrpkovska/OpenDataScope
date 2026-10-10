// `npm run audit:numbers`: an independent number audit.
// It does NOT reuse the build's data layer: it parses the frozen CSVs itself, recomputes the closed list of
// derived values from their formulas, re-renders every logged token from those raw inputs and
// compares it with what the app renders, and checks every chart's rows against the raw tables.
// The command exits with code 1 when a mismatch is found.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { fmtInt, fmtMetricValue, fmtPct, fmtDec, fmtReadingValue, fmtSigned, NBSP } from "../src/data/format";

type Raw = Record<string, string>;
const root = process.cwd();
const csv = (rel: string): Raw[] => Papa.parse<Raw>(readFileSync(path.join(root, "data", rel), "utf8"), { header: true, skipEmptyLines: true }).data;

const metricsRaw = [...csv("phase1/metrics.csv"), ...csv("reference/metrics_supplement.csv")];
const M = new Map(metricsRaw.map((r) => [`${r.portal_id}.${r.metric}`, r]));
const num = (id: string): number => {
  const r = M.get(id);
  if (!r) throw new Error(`audit: metric ${id} not in the CSVs`);
  return Number(r.value);
};
const themes = csv("phase1/mk_themes.csv");
const formats = csv("phase1/mk_format_shares.csv");
const pubs = csv("phase1/mk_publishers.csv");
const prov = csv("phase1/eu_provenance.csv");
const profile = csv("phase1/theme_profile_mk_vs_eu.csv");
const readings: (Raw & { id: string })[] = csv("phase1/validation_readings.csv").map((r, i) => ({ ...r, id: `${r.portal_id}.v${i + 1}` }));
const portals = csv("reference/portals.csv");
const TABLES: Record<string, { key: string; rows: Raw[] }> = {
  mk_themes: { key: "theme_code", rows: themes },
  mk_format_shares: { key: "format_normalised", rows: formats },
  eu_provenance: { key: "country_code", rows: prov },
  theme_profile_mk_vs_eu: { key: "theme_code", rows: profile },
};

// ---- independent recomputation of the closed derived list (I4) ----
const pct = (a: number, b: number) => (a / b) * 100;
const active = pubs.filter((p) => p.active === "True").map((p) => ({ ...p, n: Number(p.datasets) }));
active.sort((a, b) => b.n - a.n);
const rankOf = (n: number) => active.filter((p) => p.n > n).length + 1; // competition ranking
const top15 = active.filter((p) => rankOf(p.n) <= 15);
const localRule = (t: string) => t.startsWith("Општина") || t.startsWith("Град Скопје");
const fmt = (f: string) => formats.find((r) => r.format_normalised === f)!;
const national = portals.filter((p) => p.portal_class === "national");
const others = national.filter((p) => p.portal_id !== "mk").map((p) => num(p.headline_metric_id!));
const RECOMPUTED: Record<string, number> = {
  "mk.resources_per_dataset": num("mk.resources_total") / num("mk.datasets_total"),
  "mk.inactive_organisations": num("mk.organisations_listed") - num("mk.publishers_active"),
  "mk.active_share": pct(num("mk.publishers_active"), num("mk.organisations_listed")),
  "mk.datasets_without_theme": num("mk.datasets_total") - num("mk.datasets_with_theme"),
  "mk.themes_used": themes.filter((t) => t.theme_code !== "NONE" && t.theme_code !== "(none)" && Number(t.datasets) > 0).length,
  "mk.tags_per_tagged_dataset": num("mk.theme_assignments") / num("mk.datasets_with_theme"),
  "mk.local_gov_listed": pubs.filter((p) => localRule(p.title!)).length,
  "mk.other_listed": num("mk.organisations_listed") - pubs.filter((p) => localRule(p.title!)).length,
  "mk.other_active": num("mk.publishers_active") - num("mk.active_local_government_publishers"),
  "mk.local_gov_dataset_share": pct(num("mk.datasets_from_local_government"), num("mk.datasets_total")),
  "mk.top5_datasets": active.slice(0, 5).reduce((s, p) => s + p.n, 0),
  "mk.top5_share": pct(active.slice(0, 5).reduce((s, p) => s + p.n, 0), num("mk.datasets_total")),
  "mk.outside_top15_publishers": active.length - top15.length,
  "mk.outside_top15_datasets": num("mk.datasets_total") - top15.reduce((s, p) => s + p.n, 0),
  "mk.outside_top15_share": pct(num("mk.datasets_total") - top15.reduce((s, p) => s + p.n, 0), num("mk.datasets_total")),
  "mk.spreadsheet_resources": Number(fmt("XLSX").resource_count) + Number(fmt("XLS").resource_count),
  "mk.spreadsheet_share": pct(Number(fmt("XLSX").resource_count) + Number(fmt("XLS").resource_count), num("mk.resources_total")),
  "mk.json_datasets_pct": pct(Number(fmt("JSON").datasets_offering), num("mk.datasets_total")),
  "mk.csv_datasets_pct": pct(Number(fmt("CSV").datasets_offering), num("mk.datasets_total")),
  "mk.not_machine_readable": num("mk.resources_total") - num("mk.machine_readable_resources"),
  "mk.not_open_format": num("mk.resources_total") - num("mk.open_format_resources"),
  "mk.no_open_licence": num("mk.datasets_licence_not_specified") + num("mk.datasets_no_licence_id"),
  "nl.other_licence": num("nl.datasets_total") - num("nl.datasets_open_licence_id"),
  "national.others_min": Math.min(...others),
  "national.others_max": Math.max(...others),
  "eu.provenance_values": prov.filter((p) => Number(p.records_on_data_europa_eu) > 0).length,
  "eu.largest_provenance_share": pct(Number(prov.find((p) => p.country_code === "de")!.records_on_data_europa_eu), num("eu.datasets_total")),
  "us.largest_publisher_share": pct(num("us.largest_publisher_records"), num("us.datasets_total")),
  "rs.largest_publisher_share": pct(num("rs.largest_publisher_datasets"), num("rs.datasets_total")),
};

const bundle = JSON.parse(readFileSync(path.join(root, "src/data/generated/opendatascope.json"), "utf8"));
type Row = { kind: string; where: string; token: string; rendered: string; expected: string; inputs: string; ok: boolean };
const rows: Row[] = [];
const push = (r: Omit<Row, "ok">) => rows.push({ ...r, ok: r.rendered.replace(/\u00a0/g, " ") === r.expected.replace(/\u00a0/g, " ") });

// derived values
for (const [id, d] of Object.entries<{ value: number; decimals: number; unit: string; formula: string }>(bundle.derived)) {
  const exp = RECOMPUTED[id];
  if (exp === undefined) {
    push({ kind: "derived", where: "derive.ts", token: id, rendered: String(d.value), expected: "NOT IN THE CLOSED LIST", inputs: d.formula });
    continue;
  }
  const f = (v: number) => (d.unit === "percent" ? fmtPct(v, d.decimals === 2 ? 2 : 1) : d.decimals ? fmtDec(v, d.decimals) : fmtInt(v));
  push({ kind: "derived", where: "derive.ts", token: id, rendered: f(d.value), expected: f(exp), inputs: d.formula });
}
if (Object.keys(bundle.derived).length !== Object.keys(RECOMPUTED).length)
  push({ kind: "derived", where: "derive.ts", token: "count", rendered: String(Object.keys(bundle.derived).length), expected: String(Object.keys(RECOMPUTED).length), inputs: "closed list size" });

// every rendered token
const operand = (id: string) => (M.has(id) ? num(id) : RECOMPUTED[id]!);
for (const t of bundle.tokenLog as { where: string; token: string; rendered: string; inputs: string[] }[]) {
  const m = /^\{(v|pct|pct2|d|t|tp|r):([^}]+)\}$/.exec(t.token)!;
  const [, kind, ref] = m as unknown as [string, string, string];
  let expected = "";
  try {
    if (kind === "v") {
      const r = M.get(ref)!;
      const raw = r.value ?? "";
      expected = fmtMetricValue(Number.isFinite(Number(raw)) && raw.trim() !== "" && !/[a-z]/i.test(raw) && (raw.match(/\./g) ?? []).length <= 1 ? Number(raw) : raw, r.unit ?? "");
    } else if (kind === "pct" || kind === "pct2") {
      const [a, b] = ref.split("/") as [string, string];
      expected = fmtPct(pct(operand(a), operand(b)), kind === "pct2" ? 2 : 1);
    } else if (kind === "d") {
      const d = bundle.derived[ref];
      const v = RECOMPUTED[ref]!;
      expected = d.unit === "percent" ? fmtPct(v, d.decimals === 2 ? 2 : 1) : d.decimals ? fmtDec(v, d.decimals) : fmtInt(v);
    } else if (kind === "r") {
      const [id, field] = ref.split("|") as [string, string];
      const r = readings.find((x) => x.id === id)!;
      const vn = /^\d+$/.test(r.visible_value!.trim()) ? Number(r.visible_value) : null;
      expected = field === "value" ? fmtReadingValue(r.visible_value!, vn) : field === "diff" ? fmtSigned(Number(r.difference)) : `${fmtSigned(Number(r.difference_pct), 3)}${NBSP}%`;
    } else {
      const [table, key, col] = ref.split("|") as [string, string, string];
      if (table === "rowcount") expected = fmtInt(TABLES[key]!.rows.length);
      else {
        const raw = TABLES[table]!.rows.find((r) => r[TABLES[table]!.key] === key)![col]!;
        const dec = raw.includes(".") ? raw.split(".")[1]!.length : 0;
        expected = kind === "tp" ? fmtPct(Number(raw), dec === 2 ? 2 : 1) : dec ? fmtDec(Number(raw), dec) : fmtInt(Number(raw));
      }
    }
  } catch (e) {
    expected = `ERROR ${(e as Error).message}`;
  }
  push({ kind: "token", where: t.where, token: t.token, rendered: t.rendered, expected, inputs: t.inputs.join(" + ") });
}

// chart rows against the raw tables
const C = bundle.charts;
const chartCheck = (id: string, label: string, got: unknown, exp: unknown) =>
  push({ kind: "chart", where: id, token: label, rendered: JSON.stringify(got), expected: JSON.stringify(exp), inputs: "raw CSV" });
chartCheck("C1", "national portals, values, descending; no EU or Serbia", C.C1.rows.map((r: { portalId: string; value: number }) => [r.portalId, r.value]),
  national.map((p) => [p.portal_id, num(p.headline_metric_id!)]).sort((a, b) => (b[1] as number) - (a[1] as number)));
chartCheck("C2", "with / without theme", C.C2.rows[0].segments.map((s: { value: number }) => s.value), [num("mk.datasets_with_theme"), num("mk.datasets_total") - num("mk.datasets_with_theme")]);
chartCheck("C3", "13 theme codes", C.C3.rows.map((r: { key: string; value: number }) => [r.key, r.value]).sort(),
  themes.filter((t) => t.theme_code !== "NONE" && t.theme_code !== "(none)").map((t) => [t.theme_code, Number(t.datasets)]).sort());
chartCheck("C4", "MK and EU % of assignments", C.C4.rows.map((r: { key: string; a: number; b: number }) => [r.key, r.a, r.b]).sort(),
  profile.map((p) => [p.theme_code, Number(p.mk_pct_of_assignments), Number(p.eu_pct_of_assignments)]).sort());
chartCheck("C5", "resources per format", C.C5.rows.map((r: { key: string; value: number }) => [r.key, r.value]).sort(), formats.map((f) => [f.format_normalised, Number(f.resource_count)]).sort());
chartCheck("C6", "machine-readable / not", C.C6.rows[0].segments.map((s: { value: number }) => s.value), [num("mk.machine_readable_resources"), num("mk.resources_total") - num("mk.machine_readable_resources")]);
chartCheck("C7", "open format / other", C.C7.rows[0].segments.map((s: { value: number }) => s.value), [num("mk.open_format_resources"), num("mk.resources_total") - num("mk.open_format_resources")]);
chartCheck("C8", "MK three parts, NL two parts", C.C8.rows.map((r: { segments: { value: number }[] }) => r.segments.map((s) => s.value)),
  [[num("mk.datasets_open_licence_id"), num("mk.datasets_licence_not_specified"), num("mk.datasets_no_licence_id")], [num("nl.datasets_open_licence_id"), num("nl.datasets_total") - num("nl.datasets_open_licence_id")]]);
chartCheck("C9", "modified / total for mk, uk, nl", C.C9.rows.map((r: { portalId: string; numerator: number; denominator: number }) => [r.portalId, r.numerator, r.denominator]),
  ["mk", "uk", "nl"].map((p) => [p, num(`${p}.records_metadata_modified_12m`), num(`${p}.datasets_total`)]));
chartCheck("C10", "published / not, all · local · other", C.C10.rows.map((r: { segments: { value: number }[] }) => r.segments.map((s) => s.value)), [
  [num("mk.publishers_active"), num("mk.organisations_listed") - num("mk.publishers_active")],
  [num("mk.active_local_government_publishers"), RECOMPUTED["mk.local_gov_listed"]! - num("mk.active_local_government_publishers")],
  [num("mk.publishers_active") - num("mk.active_local_government_publishers"), RECOMPUTED["mk.other_listed"]! - (num("mk.publishers_active") - num("mk.active_local_government_publishers"))],
]);
chartCheck("C11", "top 15 with ties", C.C11.rows.map((r: { value: number }) => r.value), top15.map((p) => p.n));
chartCheck("C12", "rs, me, al, mk", C.C12.rows.map((r: { key: string; value: number }) => [r.key, r.value]).sort(),
  ["rs", "me", "al", "mk"].map((c) => [c, Number(prov.find((p) => p.country_code === c)?.records_on_data_europa_eu ?? 0)]).sort());
const top12 = prov.filter((p) => p.country_code !== "mk").sort((a, b) => Number(b.records_on_data_europa_eu) - Number(a.records_on_data_europa_eu)).slice(0, 12);
chartCheck("C13", "top 12 provenance values plus mk", C.C13.rows.map((r: { key: string; value: number }) => [r.key, r.value]),
  [...top12.map((p) => [p.country_code, Number(p.records_on_data_europa_eu)]), ["mk", Number(prov.find((p) => p.country_code === "mk")?.records_on_data_europa_eu ?? 0)]]);

// ---- report ----
const fails = rows.filter((r) => !r.ok);
const out = path.join(root, "out", "audit");
mkdirSync(out, { recursive: true });
const summary = {
  derived: rows.filter((r) => r.kind === "derived").length,
  tokens: rows.filter((r) => r.kind === "token").length,
  charts: rows.filter((r) => r.kind === "chart").length,
  failures: fails.length,
};
writeFileSync(path.join(out, "number-audit.json"), JSON.stringify({ summary, rows }, null, 2));
const md = [
  "# Number audit (independent recomputation from the frozen CSVs)",
  "",
  `Derived values recomputed: ${summary.derived} · rendered tokens re-rendered: ${summary.tokens} · chart row sets checked: ${summary.charts} · **mismatches: ${summary.failures}**`,
  "",
  "| Kind | Where | Token / value | App renders | Recomputed from CSV | Inputs | Result |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.kind} | ${r.where} | \`${r.token.replace(/\|/g, "\\|")}\` | ${r.rendered.replace(/\|/g, "\\|").slice(0, 120)} | ${r.expected.replace(/\|/g, "\\|").slice(0, 120)} | ${r.inputs.replace(/\|/g, "\\|").slice(0, 100)} | ${r.ok ? "PASS" : "**FAIL**"} |`),
  "",
].join("\n");
writeFileSync(path.join(out, "number-audit.md"), md);
console.log(`[number-audit] ${fails.length ? "FAIL" : "PASS"}: ${summary.derived} derived values recomputed, ${summary.tokens} tokens re-rendered, ${summary.charts} chart row sets checked; ${fails.length} mismatches`);
for (const f of fails.slice(0, 20)) console.log(`  ${f.kind} ${f.where} ${f.token}: app "${f.rendered}" vs csv "${f.expected}"`);
process.exit(fails.length ? 1 : 0);
