// Overview G: "What the comparison shows". Seven statements, each with an evidence link.
import type { ContentItem } from "@/data/types";

export const CONCLUSION: ContentItem[] = [
  {
    id: "smaller",
    template:
      "North Macedonia has a much smaller catalogue than the other national portals: {v:mk.datasets_total} datasets against {d:national.others_min} to {d:national.others_max} records.",
    status: "partial",
    href: "#catalogue-size",
  },
  {
    id: "volume",
    template:
      "Dataset volume alone does not determine open-data maturity. Larger totals also count directory, register, restricted or non-public records, so units differ.",
    status: null,
    href: "/methodology#comparability",
  },
  {
    id: "machine-readable",
    template:
      "Machine-readable coverage is high under the project definition: {pct:mk.machine_readable_resources/mk.resources_total} of resources.",
    status: null,
    href: "/north-macedonia#machine-readability",
  },
  {
    id: "spreadsheets",
    template:
      "Spreadsheet formats dominate ({d:mk.spreadsheet_share} XLSX and XLS); open formats are {pct:mk.open_format_resources/mk.resources_total} of resources.",
    status: null,
    href: "/north-macedonia#formats",
  },
  {
    id: "themes",
    template:
      "Theme coverage is broad but incomplete: {d:mk.themes_used} themes are used and {pct:mk.datasets_without_theme/mk.datasets_total} of datasets carry none.",
    status: null,
    href: "/north-macedonia#themes",
  },
  {
    id: "opportunities",
    template:
      "Licence metadata ({pct:mk.datasets_open_licence_id/mk.datasets_total} open-licence identifiers) and EU discoverability ({v:mk.records_on_data_europa_eu} records) are the clearest opportunities.",
    status: null,
    href: "/north-macedonia#opportunities",
  },
  {
    id: "definitions",
    template:
      "Portal definitions and counting practices differ internationally, so OpenDataScope compares portals only where units and queries match.",
    status: null,
    href: "/compare",
  },
];
