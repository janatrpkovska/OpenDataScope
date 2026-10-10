// North Macedonia I: opportunities supported by the evidence.
// Written as actions on the catalogue, never as criticism of a body or a government.
import type { ContentItem } from "@/data/types";

export const OPPORTUNITIES: (ContentItem & { title: string; section: string })[] = [
  {
    id: "licences",
    title: "Complete licence metadata",
    template:
      "{d:mk.no_open_licence} of {v:mk.datasets_total} datasets ({pct:mk.no_open_licence/mk.datasets_total}) have no open-licence identifier",
    status: null,
    href: "#licensing",
    section: "F",
  },
  {
    id: "formats",
    title: "Offer more web-ready formats such as JSON",
    template:
      "JSON in {t:mk_format_shares|JSON|resource_count} of {v:mk.resources_total} resources; no GeoJSON label among the {v:mk.format_labels_raw_resource_level} raw labels",
    status: null,
    href: "#formats",
    section: "D",
  },
  {
    id: "eu",
    title: "Improve visibility on the EU aggregator",
    template: "{v:mk.records_on_data_europa_eu} records on data.europa.eu",
    status: null,
    href: "#eu-discoverability",
    section: "H",
  },
  {
    id: "participation",
    title: "Broaden publisher participation",
    template:
      "{d:mk.inactive_organisations} of {v:mk.organisations_listed} listed organisations have no public dataset; {v:mk.active_local_government_publishers} of {d:mk.local_gov_listed} local-government bodies publish",
    status: null,
    href: "#publishers",
    section: "B",
  },
  {
    id: "themes",
    title: "Classify the remaining datasets by theme",
    template: "{d:mk.datasets_without_theme} datasets ({pct:mk.datasets_without_theme/mk.datasets_total}) have no theme",
    status: null,
    href: "#themes",
    section: "C",
  },
  {
    id: "labels",
    title: "Standardise format labels",
    template:
      "{v:mk.format_labels_raw_resource_level} free-text labels; {t:mk_format_shares|(empty)|resource_count} resources have no format",
    status: null,
    href: "#formats",
    section: "D",
  },
  {
    id: "metadata",
    title: "Review catalogue metadata regularly",
    template:
      "{pct:mk.records_metadata_modified_12m/mk.datasets_total} of records had metadata modified in the last 12 months (UK {pct:uk.records_metadata_modified_12m/uk.datasets_total}, NL {pct:nl.records_metadata_modified_12m/nl.datasets_total} on the same query)",
    status: null,
    href: "#metadata-activity",
    section: "G",
  },
];
