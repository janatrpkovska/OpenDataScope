// Methodology content: rendered through tokens; claims in the copy stay true to the data.
import { describe, expect, it } from "vitest";
import { data } from "@/data";
import { CHECKS, METHODOLOGY_SECTIONS, METHODOLOGY_TEMPLATES, PROCESS_STEPS } from "@/content/methodology";
import { driftRows, layerRows, sourceRegisterRows } from "@/data/views";

describe("methodology", () => {
  it("has the 12 E5 sections and anchors in order", () => {
    expect(METHODOLOGY_SECTIONS.map((s) => s.id)).toEqual([
      "research-question", "process", "data-sources", "collection", "snapshot", "cleaning",
      "format-normalisation", "theme-mapping", "derived-indicators", "comparability", "validation", "source-register",
    ]);
  });
  it("has the brief's ten process steps and 13 validation checks", () => {
    expect(PROCESS_STEPS.map((s) => s.title)).toEqual([
      "Define the problem", "Retrieve data", "Inspect and understand", "Clean and standardise", "Handle missing and incomparable values",
      "Explore", "Compare", "Visualise", "Interpret", "Document limitations",
    ]);
    expect(CHECKS).toHaveLength(13);
  });
  it("every template rendered at build time with no token left", () => {
    for (const k of Object.keys(METHODOLOGY_TEMPLATES)) {
      expect(data.content.methodology[k], k).toBeTruthy();
      expect(data.content.methodology[k], k).not.toMatch(/\{(v|pct|pct2|d|t|tp|r):/);
    }
    expect(data.content.methodology.check11).toBe("169,224 = 169,172 + 35 + 17 ✓");
    expect(data.content.methodology.check3).toBe("Identical (390 / 207 / 116 / 39 / 12 / 4) ✓");
  });
  it("check 12's claim holds: Germany has the largest absolute drift among core-portal later readings", () => {
    const nat = data.portals.filter((p) => p.portalClass === "national").map((p) => p.headlineMetricId);
    const v = data.validation.filter((r) => r.layer === "V" && r.canonicalMetricId && nat.includes(r.canonicalMetricId) && r.differencePct !== null);
    const max = v.reduce((a, b) => (Math.abs(b.differencePct!) > Math.abs(a.differencePct!) ? b : a));
    expect(max.id).toBe("de.v12");
    expect(data.content.methodology.check12).toContain("+0.058");
  });
  it("check 13's claim holds: the NL harvested copy is below the register", () => {
    const nl = data.metrics["nl.records_on_data_europa_eu_catalogue"]!.value as number;
    expect(nl).toBeLessThan(data.metrics["nl.datasets_total"]!.value as number);
  });
  it("layer times come from metrics.csv and match the snapshot window", () => {
    const rows = layerRows();
    expect(rows[0]!.utc).toContain("22:21:21");
    expect(rows[1]!.utc).toContain("23:03:52");
    expect(driftRows().length).toBeGreaterThanOrEqual(6);
  });
  it("source register reflects the reconciled sources.csv", () => {
    const rows = sourceRegisterRows();
    expect(rows).toHaveLength(45);
    expect(rows.find((r) => r.id === "P1-report")!.url).toBe("internal_project_document");
    expect(rows.find((r) => r.id === "V-mk-search")!.url).toBe("not_recorded");
    expect(rows.filter((r) => String(r.id).startsWith("DOC-") && r.url === "recorded")).toHaveLength(8);
  });
});
