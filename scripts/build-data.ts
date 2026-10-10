// `npm run data` (also runs before `dev` and `build`).
// CSV → checks 1–9 → check 10 → src/data/generated/opendatascope.json + public/data/ (15 CSVs + manifest).
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BuildCheckError, buildBundle } from "../src/data/build";
import { CSV_FILES } from "../src/data/schema";
import { checkLiterals } from "./check-literals";

const root = process.cwd();
const dataDir = path.join(root, "data");

// Phase 1 and reference tables each chart reads; shown in the chart's statement record.
const CHART_TABLES: Record<string, string[]> = {
  C1: ["metrics.csv", "portals.csv"],
  C2: ["mk_themes.csv"],
  C3: ["mk_themes.csv", "theme_labels.csv"],
  C4: ["theme_profile_mk_vs_eu.csv"],
  C5: ["mk_format_shares.csv", "mk_format_labels_raw.csv"],
  C6: ["metrics.csv"],
  C7: ["metrics.csv"],
  C8: ["metrics.csv", "metrics_supplement.csv"],
  C9: ["metrics.csv"],
  C10: ["mk_publishers.csv"],
  C11: ["mk_publishers.csv", "mk_publisher_names_en.csv"],
  C12: ["eu_provenance.csv", "country_names.csv"],
  C13: ["eu_provenance.csv", "country_names.csv"],
};

/**
 * "Values in this statement" records for the source drawer: for every rendered copy item, each token's
 * rendered value with the inputs it was computed from (metric ids, derived ids, table cells). Charts get one
 * record joining the tokens of their title, subtitle and notes with the chart's input metrics and tables.
 */
function buildStatements(bundle: ReturnType<typeof buildBundle>) {
  type Tok = { token: string; rendered: string; inputs: string[] };
  const out: Record<string, { text: string | null; tokens: Tok[]; metricIds: string[]; tables: string[] }> = {};
  const textOf = (where: string): string | null => {
    const [kind, ...rest] = where.split(".");
    const id = rest.join(".");
    if (kind === "text") return bundle.content.text[id] ?? null;
    if (kind === "findings") return bundle.content.findings.find((f) => f.id === id)?.text ?? null;
    if (kind === "conclusion") return bundle.content.conclusion.find((f) => f.id === id)?.text ?? null;
    if (kind === "opportunities") return bundle.content.opportunities.find((f) => f.id === id)?.text ?? null;
    if (kind === "methodology") return bundle.content.methodology[id] ?? null;
    if (where === "summary" || kind === "summary") return bundle.content.summary.text;
    return null;
  };
  for (const t of bundle.tokenLog) {
    const s = (out[t.where] ??= { text: textOf(t.where), tokens: [], metricIds: [], tables: [] });
    s.tokens.push({ token: t.token, rendered: t.rendered, inputs: t.inputs });
  }
  for (const [id, model] of Object.entries(bundle.charts)) {
    const tokens = bundle.tokenLog.filter((t) => t.where.startsWith(`text.${id}_`)).map((t) => ({ token: t.token, rendered: t.rendered, inputs: t.inputs }));
    out[`chart.${id}`] = { text: model.title, tokens, metricIds: model.metricIds, tables: CHART_TABLES[id] ?? [] };
  }
  return out;
}

function main() {
  const bundle = buildBundle(dataDir); // checks 1–9

  // check 10: no hard-coded statistics in UI files
  const values = Object.values(bundle.metrics).map((m) => m.value).filter((v): v is number => typeof v === "number");
  const uiRoots = ["src/app", "src/components"].map((d) => path.join(root, d)).filter((d) => existsSync(d));
  const violations = checkLiterals(uiRoots, values);
  if (violations.length) {
    const list = violations.map((v) => `${v.file}:${v.line} (${v.value}) "${v.text}"`).join("\n  ");
    throw new BuildCheckError(10, "no-hard-coded-statistics", `canonical values typed into UI files:\n  ${list}`);
  }

  const genDir = path.join(root, "src", "data", "generated");
  mkdirSync(genDir, { recursive: true });
  writeFileSync(path.join(genDir, "opendatascope.json"), JSON.stringify(bundle));
  // Slim index for the client-side source drawer: every record a "View source" can open.
  const sourceIndex = {
    snapshot: bundle.snapshot,
    portals: Object.fromEntries(bundle.portals.map((p) => [p.id, { country: p.country, displayName: p.displayName, portalClass: p.portalClass, headlineMetricId: p.headlineMetricId, unitNote: p.unitNote }])),
    metrics: bundle.metrics,
    readings: Object.fromEntries(bundle.validation.map((v) => [v.id, v])),
    sources: Object.fromEntries(bundle.sources.map((s) => [s.id, s])),
    derived: bundle.derived,
    cells: Object.fromEntries(bundle.access.map((a) => [`${a.portalId}.${a.feature}`, a])),
    statements: buildStatements(bundle),
  };
  writeFileSync(path.join(genDir, "source-index.json"), JSON.stringify(sourceIndex));

  const pub = path.join(root, "public", "data");
  rmSync(pub, { recursive: true, force: true });
  mkdirSync(pub, { recursive: true });
  for (const name of CSV_FILES) copyFileSync(path.join(dataDir, name), path.join(pub, path.basename(name)));
  const manifest = {
    project: "OpenDataScope",
    author: "Jana Trpkovska · FINKI · 2026",
    snapshot: bundle.snapshot.label,
    note: "Phase 1 tables are frozen (verified against CHECKSUMS.sha256 before every build). Reference tables are rebuilt by tools/build_reference_tables.py.",
    files: bundle.downloads.map((d) => ({ file: path.basename(d.path), origin: d.origin, rows: d.rows, bytes: d.bytes, sha256: d.sha256 })),
  };
  writeFileSync(path.join(pub, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(
    `[data] PASS: checks 1–10 · ${Object.keys(bundle.metrics).length} metrics · ${bundle.validation.length} validation readings · ` +
      `${bundle.sources.length} sources · ${bundle.access.length} matrix cells · ${Object.keys(bundle.derived).length} derived values · ` +
      `${bundle.tokenLog.length} tokens · ${bundle.downloads.length} CSVs + manifest`,
  );
}

try {
  main();
} catch (e) {
  console.error(e instanceof BuildCheckError ? e.message : e);
  process.exit(1);
}
