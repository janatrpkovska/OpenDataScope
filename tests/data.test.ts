// Data-layer tests: derived values (I4), token rendering and formatting (F3, I4),
// checksum failure behaviour (I3 check 1), missing-value behaviour (O), and checks 2–10.
// Tamper tests always work on a temporary copy of data/: the repository is never modified.
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkLiterals } from "../scripts/check-literals";
import { BuildCheckError, buildBundle, sha256 } from "../src/data/build";
import { competitionRanks, topWithTies } from "../src/data/derive";
import { fmtFraction, fmtInt, fmtMetricValue, fmtPct, NBSP, round } from "../src/data/format";
import { renderTemplate, TokenError, type TokenContext } from "../src/data/tokens";
import type { Metric } from "../src/data/types";

const DATA = path.join(__dirname, "..", "data");
const bundle = buildBundle(DATA);
const temps: string[] = [];

function tempData(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ods-data-"));
  temps.push(dir);
  cpSync(DATA, dir, { recursive: true });
  return dir;
}
function edit(dir: string, rel: string, fn: (s: string) => string) {
  const p = path.join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, "utf8")));
}
/** Re-sign a tampered Phase 1 file so that later checks (not check 1) are exercised. */
function resign(dir: string, file: string) {
  const sums = path.join(dir, "phase1", "CHECKSUMS.sha256");
  const lines = readFileSync(sums, "utf8").trim().split("\n").map((l) => (l.endsWith(`  ${file}`) ? `${sha256(readFileSync(path.join(dir, "phase1", file)))}  ${file}` : l));
  writeFileSync(sums, lines.join("\n") + "\n");
}
function expectCheck(dir: string, check: number) {
  try {
    buildBundle(dir);
  } catch (e) {
    expect(e).toBeInstanceOf(BuildCheckError);
    expect((e as BuildCheckError).check).toBe(check);
    return e as BuildCheckError;
  }
  throw new Error(`expected build check ${check} to fail`);
}
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

describe("derived values", () => {
  const SPEC_I4: Record<string, number> = {
    "mk.resources_per_dataset": 2.09,
    "mk.inactive_organisations": 70,
    "mk.active_share": 47.0,
    "mk.datasets_without_theme": 115,
    "mk.themes_used": 13,
    "mk.tags_per_tagged_dataset": 1.26,
    "mk.local_gov_listed": 72,
    "mk.other_listed": 60,
    "mk.other_active": 44,
    "mk.local_gov_dataset_share": 54.7,
    "mk.top5_datasets": 248,
    "mk.top5_share": 32.3,
    "mk.outside_top15_publishers": 47,
    "mk.outside_top15_datasets": 276,
    "mk.outside_top15_share": 35.9,
    "mk.spreadsheet_resources": 919,
    "mk.spreadsheet_share": 57.3,
    "mk.json_datasets_pct": 0.9,
    "mk.csv_datasets_pct": 58.9,
    "mk.not_machine_readable": 148,
    "mk.not_open_format": 1067,
    "mk.no_open_licence": 597,
    "nl.other_licence": 2167,
    "national.others_min": 20791,
    "national.others_max": 590168,
    "eu.provenance_values": 38,
    "eu.largest_provenance_share": 49.2,
    "us.largest_publisher_share": 55.8,
    "rs.largest_publisher_share": 46.4,
  };
  it("is a closed list: exactly the I4 values (plus the documented C11 count)", () => {
    expect(Object.keys(bundle.derived).sort()).toEqual(Object.keys(SPEC_I4).sort());
  });
  it.each(Object.entries(SPEC_I4))("%s = %s", (id, value) => {
    expect(bundle.derived[id]!.value).toBe(value);
    expect(bundle.derived[id]!.formula.length).toBeGreaterThan(5);
    expect(bundle.derived[id]!.inputs.length).toBeGreaterThan(0);
  });
  it("flags project-defined values", () => {
    expect(bundle.derived["mk.not_machine_readable"]!.projectDefined).toBe(true);
    expect(bundle.derived["mk.local_gov_listed"]!.projectDefined).toBe(true);
    expect(bundle.derived["mk.top5_share"]!.projectDefined).toBe(false);
  });
  it("ranks publishers with competition ranking and keeps ties at the top-15 boundary", () => {
    expect(competitionRanks([68, 57, 52, 38, 33, 33, 26])).toEqual([1, 2, 3, 4, 5, 5, 7]);
    const active = bundle.publishers.filter((p) => p.active);
    expect(active.find((p) => p.datasets === 20)!.rank).toBe(15);
    expect(active.find((p) => p.datasets === 19)!.rank).toBe(16);
    expect(topWithTies([5, 4, 4, 3], (x) => x, 2)).toEqual([5, 4, 4]);
    expect(bundle.charts.C11.rows).toHaveLength(15);
  });
});

describe("formatting rules", () => {
  it("rounds half away from zero, robust to binary representation", () => {
    expect(round(54.6875, 1)).toBe(54.7);
    expect(round(33.59375, 1)).toBe(33.6);
    expect(round(90.77881, 2)).toBe(90.78);
    expect(round(0.5, 0)).toBe(1);
  });
  it("uses thousands separators and a non-breaking space before %", () => {
    expect(fmtInt(1728623)).toBe("1,728,623");
    expect(fmtPct(85.026)).toBe(`85.0${NBSP}%`);
    expect(fmtPct(81.6795, 2)).toBe(`81.68${NBSP}%`);
    expect(fmtFraction(16982, 20791)).toBe(`16,982 / 20,791 = 81.68${NBSP}%`);
  });
  it("formats percent-unit metrics with % and never formats a null", () => {
    expect(fmtMetricValue(94.6, "percent")).toBe(`94.6${NBSP}%`);
    expect(fmtMetricValue("2.10.9", "version")).toBe("2.10.9");
    expect(() => fmtMetricValue(null, "dataset")).toThrow(/MissingValue/);
  });
});

describe("token rendering", () => {
  const ctx: TokenContext = {
    metric: (id) => bundle.metrics[id],
    derived: (id) => bundle.derived[id],
    table: (t, k, c) => (t === "mk_themes" && k === "GOVE" && c === "datasets" ? "312" : t === "mk_format_shares" && k === "CSV" && c === "share_of_datasets_pct" ? "58.9" : undefined),
  };
  it("renders every token kind", () => {
    const r = renderTemplate(
      "{v:mk.datasets_total}|{pct:mk.datasets_with_theme/mk.datasets_total}|{pct2:mk.machine_readable_resources/mk.resources_total}|{d:mk.top5_share}|{d:mk.resources_per_dataset}|{t:mk_themes|GOVE|datasets}|{tp:mk_format_shares|CSV|share_of_datasets_pct}|{v:us.federal_share_pct}|{v:mk.records_on_data_europa_eu}",
      ctx,
      "test",
    );
    expect(r.text).toBe(`768|85.0${NBSP}%|90.78${NBSP}%|32.3${NBSP}%|2.09|312|58.9${NBSP}%|94.6${NBSP}%|0`);
    expect(r.inputs).toContain("mk.datasets_total");
    expect(r.inputs).toContain("derived.mk.top5_share");
    expect(r.inputs).toContain("table:mk_themes|GOVE|datasets");
  });
  it("accepts derived counts as share operands", () => {
    expect(renderTemplate("{pct:mk.no_open_licence/mk.datasets_total}", ctx, "t").text).toBe(`77.7${NBSP}%`);
  });
  it("throws on unknown metrics, derived values and table cells", () => {
    expect(() => renderTemplate("{v:mk.nope}", ctx, "t")).toThrow(TokenError);
    expect(() => renderTemplate("{d:mk.nope}", ctx, "t")).toThrow(TokenError);
    expect(() => renderTemplate("{t:mk_themes|XXXX|datasets}", ctx, "t")).toThrow(TokenError);
    expect(() => renderTemplate("{pct:mk.datasets_total}", ctx, "t")).toThrow(TokenError);
  });
  it("logs every rendered token of the build", () => {
    expect(bundle.tokenLog.length).toBeGreaterThan(100);
    expect(bundle.tokenLog.every((e) => e.rendered.length > 0)).toBe(true);
  });
});

describe("check 1: Phase 1 checksums", () => {
  it("passes on the frozen data", () => {
    expect(() => buildBundle(DATA)).not.toThrow();
  });
  it("fails when one byte of a Phase 1 CSV changes, and passes again once restored", () => {
    const dir = tempData();
    const file = path.join(dir, "phase1", "metrics.csv");
    const original = readFileSync(file);
    const tampered = Buffer.from(original);
    tampered[tampered.length - 2] = tampered[tampered.length - 2]! ^ 0x01; // flip one bit in one byte
    writeFileSync(file, tampered);
    const err = expectCheck(dir, 1);
    expect(err.message).toMatch(/SHA-256 mismatch/);
    expect(err.file).toBe("phase1/metrics.csv");
    writeFileSync(file, original);
    expect(() => buildBundle(dir)).not.toThrow();
  });
  it("fails when a Phase 1 file is missing", () => {
    const dir = tempData();
    rmSync(path.join(dir, "phase1", "eu_provenance.csv"));
    expectCheck(dir, 1);
  });
});

describe("missing values", () => {
  it("never parses a number from an empty cell (check 2)", () => {
    const dir = tempData();
    edit(dir, "reference/metrics_supplement.csv", (s) => s.replace("mk,licence_cc_zero,116,", "mk,licence_cc_zero,,"));
    const err = expectCheck(dir, 2);
    expect(err.message).toMatch(/empty cell/);
  });
  it("keeps validation readings without a canonical counterpart as null, not 0", () => {
    const fr76k = bundle.validation.find((v) => v.visibleValue === "76K")!;
    expect(fr76k.canonicalValue).toBeNull();
    expect(fr76k.visibleNumber).toBeNull();
    expect(fr76k.canonicalMetricId).toBeNull();
    const timeout = bundle.validation.find((v) => v.visibleValue.startsWith("HTTP 504"))!;
    expect(timeout.difference).toBeNull();
  });
  it("records a genuine zero as 0 with its evidence", () => {
    expect(bundle.metrics["mk.records_on_data_europa_eu"]!.value).toBe(0);
    expect(bundle.content.text.euZeroEvidence).toMatch(/^0 records: North Macedonia is absent from the complete 38-value provenance facet\.$/);
  });
  it("keeps Germany's HVD count and other uncollected cells as missing states", () => {
    const de = bundle.access.find((a) => a.portalId === "de" && a.feature === "hvd")!;
    expect(de.state).toBe("not_collected");
    expect(de.comparability).toBeNull();
    expect(bundle.access.filter((a) => a.state === "not_collected").every((a) => !/\b0\b/.test(a.display))).toBe(true);
  });
  it("types a metric's null value only together with a missing reason", () => {
    const m: Metric = { ...bundle.metrics["mk.datasets_total"]!, value: null, missingReason: "not_collected" };
    expect(m.missingReason).toBe("not_collected");
  });
});

describe("checks 3–10 on tampered copies", () => {
  it("check 3: duplicate metric id", () => {
    const dir = tempData();
    edit(dir, "reference/metrics_supplement.csv", (s) => s + s.trim().split("\n")[1] + "\n");
    expectCheck(dir, 3);
  });
  it("check 3: a metric source URL that resolves to no source", () => {
    const dir = tempData();
    edit(dir, "reference/sources.csv", (s) => s.replace("S1-us-organizations,", "S1-us-organizations-x,").replace("https://catalog.data.gov/api/organizations,recorded,2026-10-08T22:22:35Z", "https://catalog.data.gov/api/other,recorded,2026-10-08T22:22:35Z"));
    expectCheck(dir, 3);
  });
  it("check 4: a portal headline that is not its datasets_total", () => {
    const dir = tempData();
    edit(dir, "reference/portals.csv", (s) => s.replace(",uk.datasets_total,", ",uk.organisations_listed,"));
    expectCheck(dir, 4);
  });
  it("check 5: MK totals that do not reconcile", () => {
    const dir = tempData();
    edit(dir, "phase1/mk_format_labels_raw.csv", (s) => s.replace("cvs,CSV,1,S2", "cvs,CSV,2,S2"));
    resign(dir, "mk_format_labels_raw.csv");
    expectCheck(dir, 5);
  });
  it("check 5: an active publisher without an English name", () => {
    const dir = tempData();
    edit(dir, "reference/mk_publisher_names_en.csv", (s) => s.split("\n").filter((l) => !l.startsWith("upm,")).join("\n"));
    expectCheck(dir, 5);
  });
  it("check 6: a stored share that does not reconcile", () => {
    const dir = tempData();
    edit(dir, "phase1/mk_themes.csv", (s) => s.replace("GOVE,Government and public sector,312,40.6", "GOVE,Government and public sector,312,41.6"));
    resign(dir, "mk_themes.csv");
    expectCheck(dir, 6);
  });
  it("check 7: a token that does not resolve", () => {
    const dir = tempData();
    edit(dir, "reference/access_matrix.csv", (s) => s.replace("{v:mk.publishers_active}", "{v:mk.publishers_activ}"));
    expectCheck(dir, 7);
  });
  it("check 8: a missing-state cell that carries a comparability badge", () => {
    const dir = tempData();
    edit(dir, "reference/access_matrix.csv", (s) => s.replace("de,hvd,not_collected,Shown on the homepage but not transcribed,,,", "de,hvd,not_collected,Shown on the homepage but not transcribed,,direct,"));
    expectCheck(dir, 8);
  });
  it("check 9: a validation reading that links to no metric", () => {
    const dir = tempData();
    edit(dir, "phase1/validation_readings.csv", (s) => s.replace("V,validation,59491,4,0.007", "V,validation,59492,3,0.005"));
    resign(dir, "validation_readings.csv");
    expectCheck(dir, 9);
  });
  it("check 2: a publisher name still marked needs_review", () => {
    const dir = tempData();
    edit(dir, "reference/mk_publisher_names_en.csv", (s) => s.replace("abbreviation_expanded,false", "abbreviation_expanded,true"));
    expectCheck(dir, 2);
  });
  it("check 10: finds canonical values typed into UI files, ignoring layout attributes", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ods-ui-"));
    temps.push(dir);
    writeFileSync(path.join(dir, "Bad.tsx"), `export const A = () => <p className="w-[768px]">The portal lists 1,605 resources</p>;\nexport const B = () => <svg viewBox="0 0 768 20" aria-label="768 datasets" />;\n`);
    const v = checkLiterals([dir], [768, 1605, 9]);
    expect(v.map((x) => x.value).sort()).toEqual([1605, 768]);
  });
  it("check 10: the real UI files contain no canonical statistic", () => {
    const values = Object.values(bundle.metrics).map((m) => m.value).filter((v): v is number => typeof v === "number");
    const roots = ["src/app", "src/components"].map((d) => path.join(__dirname, "..", d));
    expect(checkLiterals(roots.filter((r) => existsSync(r)), values)).toEqual([]);
  });
});

describe("source register (reconciled sources.csv)", () => {
  it("has 45 sources, eight recorded documentation URLs, one internal document and one genuinely missing URL", () => {
    expect(bundle.sources).toHaveLength(45);
    const docs = bundle.sources.filter((s) => s.id.startsWith("DOC-"));
    expect(docs).toHaveLength(8);
    expect(docs.every((s) => s.urlStatus === "recorded" && s.url!.startsWith("https://"))).toBe(true);
    expect(bundle.sources.find((s) => s.id === "P1-report")).toMatchObject({ url: null, urlStatus: "internal_project_document" });
    expect(bundle.sources.filter((s) => s.urlStatus === "not_recorded").map((s) => s.id)).toEqual(["V-mk-search"]);
  });
  it("resolves every metric and every validation reading to a source", () => {
    const ids = new Set(bundle.sources.map((s) => s.id));
    expect(Object.values(bundle.metrics).every((m) => ids.has(m.sourceId))).toBe(true);
    expect(bundle.validation.every((v) => v.sourceId && ids.has(v.sourceId))).toBe(true);
  });
});
