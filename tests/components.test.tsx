// @vitest-environment jsdom
// Primitive and component tests.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { data, resolveMetric, source, text } from "@/data";
import type { MissingReason, ResolvedMetric, Row } from "@/data/types";
import { ComparabilityBadge, MissingValue, ProjectIndicatorLabel, StateChip } from "@/components/ui/Badges";
import { MetricCard, PortalMetricGrid } from "@/components/ui/MetricCard";
import { ValidationBadge, validationSentence } from "@/components/ui/ValidationBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState, MethodologyNote } from "@/components/ui/Notes";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { SourceProvider } from "@/components/source/SourceProvider";
import { SourceDrawer, SourceLinkView } from "@/components/source/SourceDrawer";
import { SourceBadge } from "@/components/source/SourceBadge";

beforeAll(() => {
  // jsdom has no modal dialog implementation
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(() => cleanup());

const withProvider = (ui: ReactNode) => render(<SourceProvider>{ui}</SourceProvider>);
const REASONS: MissingReason[] = ["not_reliably_available", "not_collected", "not_comparable", "not_applicable"];
const LABELS: Record<MissingReason, string> = {
  not_reliably_available: "Not reliably available",
  not_collected: "Not collected",
  not_comparable: "Not comparable",
  not_applicable: "Not applicable",
};

function nullMetric(reason: MissingReason): ResolvedMetric {
  const base = resolveMetric("es.datasets_total");
  return { ...base, id: "es.test_missing", value: null, missingReason: reason, display: "", validation: [] };
}

describe("missing values", () => {
  it.each(REASONS)("MissingValue renders words for %s, never 0, a dash or an empty cell", (reason) => {
    const { container } = render(<MissingValue reason={reason} />);
    const el = container.querySelector(`[data-missing="${reason}"]`)!;
    expect(el).toHaveTextContent(LABELS[reason]);
    expect(el.textContent).not.toMatch(/^\s*(0|—|-|N\/A)?\s*$/);
    expect(el).toHaveClass("missing-value");
  });

  it.each(REASONS)("MetricCard with a null value (%s) shows the label and never 0", (reason) => {
    const { container } = withProvider(<MetricCard metric={nullMetric(reason)} label="Test value" />);
    const num = container.querySelector(".metric-number")!;
    expect(num).toHaveAttribute("data-value", "missing");
    expect(num).toHaveTextContent(LABELS[reason]);
    expect(num.textContent).not.toMatch(/\b0\b/);
  });

  it("MissingValue with a tooltip explains its meaning", () => {
    render(<MissingValue reason="not_collected" withTooltip />);
    const btn = screen.getByRole("button", { name: "Not collected" });
    fireEvent.click(btn);
    expect(screen.getByRole("note")).toHaveTextContent("The value may exist, but Phase 1 did not collect it.");
  });

  it("StateChip renders Available and Limited as chips, and missing states as words", () => {
    const { container } = render(
      <>
        <StateChip state="available" />
        <StateChip state="limited" />
        {REASONS.map((r) => (
          <StateChip key={r} state={r} />
        ))}
      </>,
    );
    expect(container.querySelector('[data-state="available"]')).toHaveTextContent("Available");
    expect(container.querySelector('[data-state="limited"]')).toHaveTextContent("Limited");
    for (const r of REASONS) expect(container.querySelector(`[data-missing="${r}"]`)).toHaveTextContent(LABELS[r]);
  });

  it("DataTable renders a null cell as its reason and refuses a null without one", () => {
    const rows: Row[] = [
      { portal: "A", count: 5 },
      { portal: "B", count: null, count__missing: "not_collected" },
    ];
    const { container } = render(<DataTable caption="Counts" columns={[{ key: "portal", header: "Portal" }, { key: "count", header: "Count", align: "right" }]} rows={rows} />);
    expect(container.querySelector('table [data-missing="not_collected"]')).toHaveTextContent("Not collected");
    cleanup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<DataTable caption="Broken" columns={[{ key: "portal", header: "Portal" }, { key: "count", header: "Count" }]} rows={[{ portal: "A", count: null }]} />),
    ).toThrow(/without a missing-value reason/);
    spy.mockRestore();
  });
});

describe("a genuine zero", () => {
  it("North Macedonia's verified 0 records on data.europa.eu renders 0 with its evidence", () => {
    const m = resolveMetric("mk.records_on_data_europa_eu");
    expect(m.value).toBe(0);
    expect(m.missingReason).toBeNull();
    const { container } = withProvider(<MetricCard metric={m} label="Records on data.europa.eu" zeroEvidence={text("euZeroEvidence")} />);
    const num = container.querySelector(".metric-number")!;
    expect(num).toHaveAttribute("data-value", "0");
    expect(num.textContent?.trim()).toBe("0");
    expect(container.querySelector("[data-zero-evidence]")).toHaveTextContent(
      "0 records: North Macedonia is absent from the complete 38-value provenance facet.",
    );
    expect(container.querySelector("[data-missing]")).toBeNull();
  });
});

describe("comparability badges", () => {
  it.each([
    ["direct", "Direct", "="],
    ["partial", "Partial", "≈"],
    ["context_only", "Context only", "i"],
  ] as const)("%s shows its word and glyph", (status, word, glyph) => {
    const { container } = render(<ComparabilityBadge status={status} withTooltip={false} />);
    const el = container.querySelector(`[data-comparability="${status}"]`)!;
    expect(el).toHaveTextContent(word);
    expect(el.querySelector('[aria-hidden="true"]')).toHaveTextContent(glyph);
    if (status === "context_only") expect(el.className).toMatch(/border-dashed/);
  });

  it("the badge tooltip gives the long label, meaning and reason", () => {
    render(<ComparabilityBadge status="partial" reason="Units differ." />);
    fireEvent.click(screen.getByRole("button", { name: /Partial/ }));
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Partially comparable");
    expect(note).toHaveTextContent("Similar idea, but definitions or units differ.");
    expect(note).toHaveTextContent("Units differ.");
  });

  it("ProjectIndicatorLabel names the exact rule and says it is not a rating", () => {
    render(<ProjectIndicatorLabel rule="open_format" />);
    fireEvent.click(screen.getByRole("button", { name: /Project-defined indicator/ }));
    expect(screen.getByRole("note")).toHaveTextContent("excluding XLS, XLSX and SHP");
    expect(screen.getByRole("note")).toHaveTextContent("not an official rating or quality score");
  });
});

describe("validation reading", () => {
  const r = data.validation.find((v) => v.canonicalMetricId === "uk.datasets_total")!;
  it("renders the later reading with its signed drift and day, separate from the canonical value", () => {
    expect(validationSentence(r)).toBe("Later validation reading: 59,495 records (+4, +0.007\u00a0%) on 9 Oct 2026");
    const { container } = withProvider(<ValidationBadge reading={r} />);
    expect(container).toHaveTextContent("Later validation reading: 59,495 records");
    expect(screen.getByRole("button", { name: "Reading record" })).toBeInTheDocument();
  });

  it("a MetricCard keeps the canonical value in the main position and the reading below", () => {
    const m = resolveMetric("uk.datasets_total");
    const { container } = withProvider(<MetricCard metric={m} label="Catalogue size" showValidation />);
    expect(container.querySelector(".metric-number")).toHaveTextContent("59,491");
    expect(container.querySelector(".metric-number")).not.toHaveTextContent("59,495");
    expect(container.querySelector("[data-validation]")).toHaveTextContent("59,495");
  });

  it("an earlier reading is labelled superseded", () => {
    const earlier = data.validation.find((v) => v.layer !== "V" && v.visibleNumber !== null)!;
    expect(validationSentence(earlier)).toMatch(/^Earlier reading \(superseded\):/);
  });
});

describe("source links", () => {
  it("internal project source: 'Internal project document', no invented URL", () => {
    const s = source("P1-report");
    expect(s.urlStatus).toBe("internal_project_document");
    const { container } = render(<SourceLinkView source={s} label="Open source" />);
    expect(container).toHaveTextContent("Internal project document");
    expect(container.querySelector("a")).toBeNull();
  });

  it("recorded external documentation source: 'Open source' with the recorded URL", () => {
    const s = source("DOC-uk-api");
    expect(s.urlStatus).toBe("recorded");
    render(<SourceLinkView source={s} label="Open source" />);
    const a = screen.getByRole("link", { name: /Open source/ });
    expect(a).toHaveAttribute("href", "https://guidance.data.gov.uk/get_data/api_documentation/");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("generic missing-URL source: 'URL not recorded', no link", () => {
    const s = source("V-mk-search");
    expect(s.urlStatus).toBe("not_recorded");
    const { container } = render(<SourceLinkView source={s} label="Open source" />);
    expect(container).toHaveTextContent("URL not recorded");
    expect(container.querySelector("a")).toBeNull();
  });

  it("the drawer shows the full K2 record for a metric, with layer, times and validation", () => {
    render(<SourceDrawer target={{ metricId: "uk.datasets_total" }} canGoBack={false} onBack={() => {}} onClose={() => {}} onOpen={() => {}} />);
    const dlg = document.querySelector("dialog.drawer") as HTMLElement;
    const w = within(dlg);
    expect(w.getByText("uk.datasets_total")).toBeInTheDocument();
    expect(dlg).toHaveTextContent("59,491 directory records");
    expect(dlg).toHaveTextContent("API snapshot · S1 · Verified from the live API");
    expect(dlg).toHaveTextContent("2026-10-08 22:21:29 UTC · 9 Oct 2026 00:21:29 in Skopje (UTC+2)");
    expect(dlg).toHaveTextContent("59,495 records · +4 (+0.007 %)"); // jest-dom normalises the NBSP before %
    expect(dlg).toHaveTextContent("9 Oct 2026, after S2 and before 11:13 UTC (exact capture time not recorded)");
    expect(dlg).toHaveTextContent("Live portals can change after the research snapshot.");
    expect(w.getByRole("link", { name: "Explained in methodology" })).toHaveAttribute("href", expect.stringMatching(/^\/methodology#/));
  });

  it("the drawer shows the internal and not-recorded variants for sources", () => {
    const { rerender } = render(<SourceDrawer target={{ sourceId: "P1-report" }} canGoBack={false} onBack={() => {}} onClose={() => {}} onOpen={() => {}} />);
    const dlg = () => document.querySelector("dialog.drawer") as HTMLElement;
    expect(dlg()).toHaveTextContent("Internal project document");
    expect(dlg().querySelectorAll('a[href^="http"]').length).toBe(0);
    rerender(<SourceDrawer target={{ sourceId: "V-mk-search" }} canGoBack={false} onBack={() => {}} onClose={() => {}} onOpen={() => {}} />);
    expect(dlg()).toHaveTextContent("URL not recorded");
    expect(dlg().querySelectorAll('a[href^="http"]').length).toBe(0);
  });

  it("SourceBadge shows the layer and opens the drawer on that record", () => {
    withProvider(<SourceBadge layer="S1" target={{ metricId: "uk.datasets_total" }} />);
    const b = screen.getByRole("button", { name: /View source \(layer S1\)/ });
    expect(b).toHaveTextContent("S1");
    fireEvent.click(b);
    const dlg = document.querySelector("dialog.drawer") as HTMLElement;
    expect(dlg).toHaveAttribute("open");
    expect(dlg).toHaveTextContent("uk.datasets_total");
    expect(window.location.search).toBe("?source=uk.datasets_total");
  });
});

describe("tables, notes and headers", () => {
  const cols = [
    { key: "name", header: "Name" },
    { key: "n", header: "Count", align: "right" as const },
  ];
  const rows: Row[] = [
    { name: "a", n: "1,605" },
    { name: "b", n: null, n__missing: "not_collected" },
    { name: "c", n: "768" },
  ];
  it("DataTable has a caption, scoped headers and aria-sort; missing values sort last both ways", () => {
    const { container } = render(<DataTable caption="Sorted" columns={cols} rows={rows} sortable />);
    const table = container.querySelector(".hidden table")!;
    expect(table.querySelector("caption")).toHaveTextContent("Sorted");
    expect(table.querySelectorAll('thead th[scope="col"]').length).toBe(2);
    expect(table.querySelectorAll('tbody th[scope="row"]').length).toBe(3);
    const countHeader = table.querySelectorAll("thead th")[1]!;
    expect(countHeader).toHaveAttribute("aria-sort", "none");
    const order = () => Array.from(table.querySelectorAll("tbody tr th")).map((t) => t.textContent);
    fireEvent.click(within(countHeader as HTMLElement).getByRole("button"));
    expect(countHeader).toHaveAttribute("aria-sort", "descending");
    expect(order()).toEqual(["a", "c", "b"]);
    fireEvent.click(within(countHeader as HTMLElement).getByRole("button"));
    expect(countHeader).toHaveAttribute("aria-sort", "ascending");
    expect(order()).toEqual(["c", "a", "b"]);
  });

  it("DataTable collapses long tables behind an expandable button", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `r${i}`, n: String(i) }));
    const { container } = render(<DataTable caption="Long" columns={cols} rows={many} collapsedRows={5} />);
    expect(container.querySelectorAll(".hidden table tbody tr").length).toBe(5);
    const btn = screen.getByRole("button", { name: /Show all 12 rows/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(container.querySelectorAll(".hidden table tbody tr").length).toBe(12);
  });

  it("the validation register keeps a scrollable table with the sideways caption", () => {
    render(<DataTable caption="Validation" columns={cols} rows={rows} mobile="scroll" />);
    const region = screen.getByRole("region", { name: /Validation \(scrollable\)/ });
    expect(region).toHaveClass("md:hidden"); // the scroll region is the mobile layout only
    expect(within(region).getByText("Scroll sideways to see all columns")).toBeInTheDocument();
    expect(region.querySelector("table caption")).toHaveTextContent("Validation");
  });

  it("SectionHeader renders an anchored heading, a lead and a badge", () => {
    render(<SectionHeader id="catalogue-size" title="How large is each national catalogue?" lead="Lead." status="partial" />);
    const h = screen.getByRole("heading", { level: 2, name: "How large is each national catalogue?" });
    expect(h).toHaveAttribute("id", "catalogue-size");
    expect(document.querySelector('[data-comparability="partial"]')).toBeInTheDocument();
  });

  it("MethodologyNote links to the methodology anchor; EmptyState explains why nothing is shown", () => {
    render(
      <>
        <MethodologyNote href="/methodology#comparability">Units differ.</MethodologyNote>
        <EmptyState title="Select at least two national portals." body="The comparison needs two values." />
      </>,
    );
    expect(screen.getByRole("link", { name: "Explained in methodology" })).toHaveAttribute("href", "/methodology#comparability");
    expect(screen.getByRole("status")).toHaveTextContent("Select at least two national portals.");
  });

  it("PortalMetricGrid renders one card per item with View source", () => {
    withProvider(
      <PortalMetricGrid
        columns={5}
        items={[
          { metric: resolveMetric("mk.datasets_total"), label: "Datasets" },
          { metric: resolveMetric("mk.resources_total"), label: "Resources" },
        ]}
      />,
    );
    expect(screen.getAllByRole("button", { name: "View source" })).toHaveLength(2);
    expect(document.querySelector('[data-metric="mk.datasets_total"] .metric-number')).toHaveTextContent("768");
  });

  it("MetricCard shows a share of another metric with its count and denominator", () => {
    const { container } = withProvider(
      <MetricCard metric={resolveMetric("mk.datasets_with_theme")} asShareOf={resolveMetric("mk.datasets_total")} label="Datasets with a theme" />,
    );
    expect(container.querySelector(".metric-number")!.textContent).toBe("85.0\u00a0%");
    expect(container).toHaveTextContent("653 of 768 datasets");
  });
});

describe("ChartCard", () => {
  it("is a figure whose caption holds the finding title and the summary, with a Chart/Table switch", () => {
    const model = data.charts.C2;
    withProvider(
      <ChartCard model={model}>
        <div data-testid="plot">plot</div>
      </ChartCard>,
    );
    const fig = screen.getByRole("figure", { name: model.title });
    const cap = fig.querySelector("figcaption")!;
    expect(cap.querySelector("h3")!.textContent).toBe(model.title);
    expect(cap.querySelector("[data-chart-summary]")!.textContent).toContain(model.summary);
    expect(screen.getByTestId("plot")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Show this chart as" });
    const tableRadio = within(group).getByRole("radio", { name: "Table" });
    fireEvent.click(tableRadio);
    expect(screen.queryByTestId("plot")).toBeNull();
    expect(fig.querySelector(".hidden table caption")).toHaveTextContent(model.table.caption);
    expect(fig).toHaveTextContent(model.sourceLine);
    expect(within(fig).getAllByRole("button", { name: "View source" }).length).toBeGreaterThan(0);
  });

  it("shows the comparability badge and warning text, and project-indicator labels where set", () => {
    withProvider(
      <>
        <ChartCard model={data.charts.C1}>x</ChartCard>
        <ChartCard model={data.charts.C6}>y</ChartCard>
      </>,
    );
    const c1 = document.querySelector('[data-chart="C1"]')!;
    expect(c1.querySelector('[data-comparability="partial"]')).toBeInTheDocument();
    expect(c1.querySelector("[data-chart-warning]")).toHaveTextContent("Units differ");
    const c6 = document.querySelector('[data-chart="C6"]')!;
    expect(c6.querySelector('[data-project-indicator="machine_readable"]')).toBeInTheDocument();
    expect(c6).toHaveTextContent("Not an official rating or quality score.");
  });

  it("renders EmptyState when every input is missing", () => {
    withProvider(
      <ChartCard model={data.charts.C12} empty>
        <div data-testid="plot">plot</div>
      </ChartCard>,
    );
    expect(screen.queryByTestId("plot")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Not reliably available from the official source");
  });
});

// Accessibility and responsive checks.
describe("accessibility and responsive fixes", () => {
  it("LangText marks Macedonian words inside English text with lang=mk (WCAG 3.1.2)", async () => {
    const { LangText } = await import("@/components/ui/LangText");
    const { container } = render(<p>{<LangText text={'titles beginning "Општина" (municipality) or "Град Скопје" (City of Skopje).'} />}</p>);
    const mk = [...container.querySelectorAll('[lang="mk"]')].map((e) => e.textContent);
    expect(mk).toEqual(["Општина", "Град Скопје"]);
    expect(container.textContent).toBe('titles beginning "Општина" (municipality) or "Град Скопје" (City of Skopje).');
  });
  it("DataTable is a table from 768 px for every column count", () => {
    const cols = ["a", "b", "c", "d", "e", "f"].map((k) => ({ key: k, header: k.toUpperCase() }));
    const { container } = render(<DataTable caption="Six columns" columns={cols} rows={[{ a: "1", b: "2", c: "3", d: "4", e: "5", f: "6" }]} />);
    expect(container.querySelector(".data-table-wrap > div.hidden.md\\:block table")).toBeInTheDocument();
    expect(container.querySelector(".data-table-wrap > div.md\\:hidden .table-cards")).toBeInTheDocument();
  });
  it("SourceBadge's accessible name always contains its visible chip text (WCAG 2.5.3)", async () => {
    const { SourceBadge } = await import("@/components/source/SourceBadge");
    render(
      <SourceProvider>
        <SourceBadge layer="S1" target={{ metricId: "mk.datasets_total" }} label="View source for North Macedonia catalogue size" />
        <SourceBadge layer="docs" target={{ metricId: "mk.datasets_total" }} label="View source for UK metadata standard" />
      </SourceProvider>,
    );
    const btns = screen.getAllByRole("button");
    for (const b of btns) expect(b.getAttribute("aria-label")!.toLowerCase()).toContain(b.textContent!.toLowerCase());
  });
});
