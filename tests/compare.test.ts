// Compare page rules.
import { describe, expect, it } from "vitest";
import { DEFAULT_SELECTION, parseSelection, rowBadge, selectionToQuery } from "@/data/compare";
import { compareRows } from "@/data/views";
import type { PortalId } from "@/data/types";

const q = (s: string) => parseSelection(new URLSearchParams(s));

describe("URL state", () => {
  it("defaults to mk, uk, us, nl with eu=0 and rs=0, without a notice", () => {
    expect(q("")).toEqual({ selection: DEFAULT_SELECTION, notices: [] });
    expect(selectionToQuery(DEFAULT_SELECTION)).toBe("portals=mk,uk,us,nl&eu=0&rs=0");
  });
  it("keeps a valid selection in canonical order", () => {
    expect(q("portals=nl,mk,de&eu=1&rs=1")).toEqual({ selection: { national: ["mk", "de", "nl"], includeEu: true, includeRs: true }, notices: [] });
  });
  it("drops unknown and duplicate IDs silently", () => {
    expect(q("portals=mk,xx,uk,uk,MK").selection.national).toEqual(["mk", "uk"]);
    expect(q("portals=mk,xx,uk,uk").notices).toEqual([]);
  });
  it("EU and Serbia are never national columns: eu/rs inside portals= are dropped", () => {
    expect(q("portals=mk,eu,rs,uk").selection.national).toEqual(["mk", "uk"]);
  });
  it("fewer than two national portals: default with 'Selection reset to the default.'", () => {
    expect(q("portals=mk")).toEqual({ selection: DEFAULT_SELECTION, notices: ["reset"] });
    expect(q("portals=")).toEqual({ selection: DEFAULT_SELECTION, notices: ["reset"] });
    expect(q("portals=zz,yy")).toEqual({ selection: DEFAULT_SELECTION, notices: ["reset"] });
    expect(q("portals=mk,mk").notices).toEqual(["reset"]);
  });
  it("more than four: the first four are kept with 'Up to four national portals can be compared.'", () => {
    expect(q("portals=es,mk,uk,us,de,fr")).toEqual({ selection: { national: ["mk", "uk", "us", "es"], includeEu: false, includeRs: false }, notices: ["max"] });
  });
  it("eu and rs accept 0 or 1 only", () => {
    expect(q("eu=1&rs=0").selection).toMatchObject({ includeEu: true, includeRs: false });
    expect(q("eu=2&rs=yes")).toEqual({ selection: DEFAULT_SELECTION, notices: ["toggle"] });
  });
});

describe("comparison table reproduces L2", () => {
  const rows = compareRows();
  const P: PortalId[] = ["mk", "uk", "us", "de", "fr", "nl", "es", "eu", "rs"];
  const code = (id: string, p: PortalId) => {
    const c = rows.find((r) => r.id === id)!.cells[p]!;
    if (c.status) return { direct: "D", partial: "P", context_only: "C" }[c.status];
    return { not_collected: "NC", not_reliably_available: "NR", not_applicable: "NA", not_comparable: "NCmp", available: "?", limited: "?" }[c.state];
  };
  const L2: Record<string, string> = {
    size: "P P P P P P P C C",
    publishers: "P P P NC C C NR C C",
    portal_type: "C C C C C C C C C",
    api: "D D D D D D D D C",
    formats: "D NC NC NC NC D NC NC NC",
    licensing: "D P NC NC NC D NC NC NC",
    metadata_standard: "C NR C NC C C C C NC",
    hvd: "NA NA NA NC C NC NC C NC",
    metadata_activity: "D D NC NC NC D NC NC NC",
    count_definition: "C C C C C C C C C",
  };
  it("has the 10 rows in L2 order", () => {
    expect(rows.map((r) => r.id)).toEqual(Object.keys(L2));
  });
  it.each(Object.entries(L2))("row %s matches L2 for all 9 portals", (id, expected) => {
    expect(P.map((p) => code(id, p)).join(" ")).toBe(expected);
  });
  it("a missing cell never carries a badge and never shows 0", () => {
    for (const r of rows)
      for (const c of Object.values(r.cells)) {
        if (c!.state !== "available" && c!.state !== "limited") {
          expect(c!.status).toBeNull();
          expect(c!.display).not.toMatch(/^0$/);
        }
      }
  });
  it("size cells carry the unit note as the second line (L4)", () => {
    const size = rows.find((r) => r.id === "size")!;
    expect(size.cells.fr!.secondary).toMatch(/76K/);
    expect(size.cells.nl!.secondary).toMatch(/non-public/);
    expect(size.cells.uk!.display).toBe("59,491 directory records");
  });
  it("row badge: weakest national status; EU/RS never lower it; fewer than two values → not comparable", () => {
    const byId = (id: string) => rows.find((r) => r.id === id)!;
    expect(rowBadge(byId("formats"), ["mk", "uk", "us"])).toBeNull();
    expect(rowBadge(byId("formats"), ["mk", "nl"])).toBe("direct");
    expect(rowBadge(byId("licensing"), ["mk", "uk", "nl"])).toBe("partial");
    expect(rowBadge(byId("api"), ["mk", "uk"])).toBe("direct"); // Serbia's C would not lower it: rs is never in the national list
    expect(rowBadge(byId("size"), ["mk", "uk", "us", "nl"])).toBe("partial");
    expect(rowBadge(byId("publishers"), ["mk", "fr"])).toBe("context_only");
    expect(rowBadge(byId("hvd"), ["mk", "uk", "us", "nl"])).toBeNull();
  });
});
