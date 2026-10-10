// Overview F: the six key findings. Every statistic is a token (section I4).
import type { ContentItem } from "@/data/types";

export const FINDINGS: ContentItem[] = [
  {
    id: "quantity",
    template:
      "North Macedonia's portal lists {v:mk.datasets_total} datasets. The six other national portals list between {d:national.others_min} and {d:national.others_max} records, counted in different units.",
    status: "partial",
    href: "#catalogue-size",
  },
  {
    id: "themes",
    template:
      "{pct:mk.datasets_with_theme/mk.datasets_total} of North Macedonian datasets carry at least one EU data-theme code. Government ({t:mk_themes|GOVE|datasets} datasets) and economy ({t:mk_themes|ECON|datasets}) are the largest themes.",
    status: null,
    href: "/north-macedonia#themes",
  },
  {
    id: "formats",
    template:
      "Spreadsheets dominate: XLSX and XLS make up {d:mk.spreadsheet_share} of the {v:mk.resources_total} resources, and JSON appears in {t:mk_format_shares|JSON|resource_count}.",
    status: null,
    href: "/north-macedonia#formats",
  },
  {
    id: "licences",
    template:
      "{pct:mk.datasets_open_licence_id/mk.datasets_total} of North Macedonian datasets carry an open-licence identifier, against {pct:nl.datasets_open_licence_id/nl.datasets_total} in the Dutch register on the same CKAN field.",
    status: "direct",
    href: "/north-macedonia#licensing",
  },
  {
    id: "metadata-activity",
    template:
      "{pct:mk.records_metadata_modified_12m/mk.datasets_total} of North Macedonian records had their metadata modified in the last 12 months, against {pct:uk.records_metadata_modified_12m/uk.datasets_total} in the UK and {pct:nl.records_metadata_modified_12m/nl.datasets_total} in the Netherlands on the same query.",
    status: "direct",
    href: "/north-macedonia#metadata-activity",
  },
  {
    id: "eu-portal",
    template:
      "No North Macedonian records appeared on data.europa.eu in the snapshot, while the regional examples Serbia ({t:eu_provenance|rs|records_on_data_europa_eu}), Montenegro ({t:eu_provenance|me|records_on_data_europa_eu}) and Albania ({t:eu_provenance|al|records_on_data_europa_eu}) did.",
    status: "direct",
    href: "/north-macedonia#eu-discoverability",
  },
];
