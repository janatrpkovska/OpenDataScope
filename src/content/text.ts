// Fixed copy that carries statistics. Every number is a token, rendered once at build time
// (scripts/build-data.ts) into bundle.content.text. Copy without numbers lives in copy.ts.
export const TEXT_TEMPLATES: Record<string, string> = {
  // Overview hero: the 30-second answer
  summary:
    "North Macedonia's portal lists {v:mk.datasets_total} datasets with {v:mk.resources_total} resources from {v:mk.publishers_active} active publishers. The other national portals list {d:national.others_min} to {d:national.others_max} records, counted in different units. {pct:mk.datasets_with_theme/mk.datasets_total} of North Macedonian datasets carry a theme and {pct:mk.machine_readable_resources/mk.resources_total} of resources are machine-readable under the project rule. However, {pct:mk.open_format_resources/mk.resources_total} use open formats, {pct:mk.datasets_open_licence_id/mk.datasets_total} of datasets carry an open-licence identifier and none appear on data.europa.eu.",
  activePublishersTooltip:
    "{v:mk.organisations_listed} organisations are listed on data.gov.mk. {v:mk.publishers_active} of them owned at least one public dataset in the snapshot; the other {d:mk.inactive_organisations} had none.",
  listedOrganisationsCaption: "registered on the portal, incl. {d:mk.inactive_organisations} with no public dataset",
  themedCaption: "{v:mk.datasets_with_theme} of {v:mk.datasets_total} carry ≥ 1 EU data-theme code",
  themedValue: "{pct:mk.datasets_with_theme/mk.datasets_total}",
  localGovLine:
    "Local-government bodies publish {v:mk.datasets_from_local_government} of the {v:mk.datasets_total} datasets ({d:mk.local_gov_dataset_share}).",
  // North Macedonia page
  nmLead:
    "data.gov.mk holds {v:mk.datasets_total} public datasets with {v:mk.resources_total} resources from {v:mk.publishers_active} active publishers.",
  resourcesCaption: "{d:mk.resources_per_dataset} per dataset",
  groupsValue: "{v:mk.groups_listed} listed",
  groupsCaption: "{v:mk.groups_assigned} in use, by {v:mk.datasets_in_assigned_groups} datasets",
  platformCaption: "{v:mk.ckan_extensions} extensions installed, incl. dcat, dcat_json_interface, mk_dcatap",
  participationLead:
    "{v:mk.publishers_active} of {v:mk.organisations_listed} listed organisations published at least one public dataset in the snapshot; {d:mk.inactive_organisations} had none.",
  concentrationLine: "The five largest publishers hold {d:mk.top5_datasets} datasets ({d:mk.top5_share}).",
  themesLead:
    "{v:mk.datasets_with_theme} of {v:mk.datasets_total} datasets ({pct:mk.datasets_with_theme/mk.datasets_total}) carry at least one theme; {d:mk.datasets_without_theme} ({pct:mk.datasets_without_theme/mk.datasets_total}) carry none.",
  groupsNote:
    "CKAN groups are a separate mechanism: {v:mk.groups_listed} listed, {v:mk.groups_assigned} used by {v:mk.datasets_in_assigned_groups} datasets.",
  formatsLead:
    "{v:mk.resources_total} resources were crawled; XLSX and XLS make up {d:mk.spreadsheet_share} of them.",
  datasetFormatLine:
    "{t:mk_format_shares|CSV|datasets_offering} datasets ({tp:mk_format_shares|CSV|share_of_datasets_pct}) offer CSV; {t:mk_format_shares|JSON|datasets_offering} ({tp:mk_format_shares|JSON|share_of_datasets_pct}) offer JSON.",
  nlJsonComparison: "Netherlands: JSON in {pct:nl.datasets_with_json/nl.datasets_total} of records (same dataset-level measure).",
  rawLabelsNote:
    "{v:mk.format_labels_raw_resource_level} raw labels map to {t:rowcount|mk_format_shares|rows} formats, for example \"CSV\", \".csv\" and \"cvs\". {t:mk_format_shares|(empty)|resource_count} resources carry no format.",
  machineReadableLead:
    "Two project-defined indicators summarise the {v:mk.resources_total} resources. Neither is an official rating.",
  mrDatasetsLine:
    "{v:mk.datasets_with_machine_readable_resource} datasets ({pct:mk.datasets_with_machine_readable_resource/mk.datasets_total}) offer at least one machine-readable resource.",
  licensingLead:
    "{v:mk.datasets_open_licence_id} of {v:mk.datasets_total} datasets ({pct:mk.datasets_open_licence_id/mk.datasets_total}) carry an open-licence identifier.",
  licenceBreakdown:
    "Open-licence identifiers: CC0 {v:mk.licence_cc_zero} · other open {v:mk.licence_other_open} · other public domain {v:mk.licence_other_pd} · CC-BY {v:mk.licence_cc_by}",
  metadataActivitySubtitle:
    "North Macedonia {pct:mk.records_metadata_modified_12m/mk.datasets_total}, United Kingdom {pct:uk.records_metadata_modified_12m/uk.datasets_total}, Netherlands {pct:nl.records_metadata_modified_12m/nl.datasets_total}",
  euZeroValue: "{v:mk.records_on_data_europa_eu} records",
  euZeroEvidence:
    "{v:mk.records_on_data_europa_eu} records: North Macedonia is absent from the complete {d:eu.provenance_values}-value provenance facet.",
  // Overview EU panel
  euTotal: "{v:eu.datasets_total}",
  euProvenanceLine: "{d:eu.provenance_values} provenance values (country codes plus one \"EUROPE\" value)",
  euHvdLine: "{v:eu.hvd_records} records flagged as High-Value Datasets",
  euLargestLine:
    "Largest provenance: Germany, {t:eu_provenance|de|records_on_data_europa_eu} records ({d:eu.largest_provenance_share})",
  euMkLine: "North Macedonia: {v:mk.records_on_data_europa_eu} records (absent from the complete provenance facet)",
  // Chart copy
  C1_title:
    "North Macedonia lists {v:mk.datasets_total} datasets; the other national portals list {d:national.others_min} to {d:national.others_max} records",
  C2_title: "{pct:mk.datasets_with_theme/mk.datasets_total} of North Macedonian datasets carry at least one theme",
  C2_subtitle: "Share of {v:mk.datasets_total} datasets with at least one EU data-theme code · S2 crawl",
  C3_title: "Government and economy lead the {d:mk.themes_used} themes used in North Macedonia",
  C3_subtitle: "Datasets per theme code, of {v:mk.datasets_total} datasets · S2 crawl",
  C3_note:
    "Theme assignments overlap because a dataset may belong to more than one theme: {v:mk.theme_assignments} assignments on {v:mk.datasets_with_theme} datasets. Shares are never summed.",
  C4_title:
    "Government is {tp:theme_profile_mk_vs_eu|GOVE|mk_pct_of_assignments} of North Macedonian theme tags, three times its EU-portal share",
  C4_annotation: "The EU-portal profile is a reference, not a target: {d:eu.largest_provenance_share} of its records come from Germany.",
  C5_title:
    "Spreadsheets are {d:mk.spreadsheet_share} of data.gov.mk resources; JSON appears {t:mk_format_shares|JSON|resource_count} times",
  C5_subtitle: "Resources by normalised format, of {v:mk.resources_total} resources · S2 crawl",
  C6_title: "{pct2:mk.machine_readable_resources/mk.resources_total} of resources are machine-readable under the project rule",
  C6_subtitle: "Share of {v:mk.resources_total} resources · S2 crawl",
  C7_title: "{pct2:mk.open_format_resources/mk.resources_total} of resources use an open format under the project rule",
  C7_subtitle: "Share of {v:mk.resources_total} resources · S2 crawl",
  C8_title:
    "{pct:mk.datasets_open_licence_id/mk.datasets_total} of North Macedonian datasets carry an open-licence identifier; {pct:nl.datasets_open_licence_id/nl.datasets_total} of Dutch records do",
  C10_title: "{v:mk.publishers_active} of {v:mk.organisations_listed} listed organisations published at least one public dataset",
  C11_title: "Three municipalities publish the most datasets; the top five hold {d:mk.top5_share}",
  C11_annotation:
    "{d:mk.outside_top15_publishers} other active publishers hold {d:mk.outside_top15_datasets} datasets ({d:mk.outside_top15_share}).",
  C13_title: "Germany supplies {d:eu.largest_provenance_share} of the EU portal's records; North Macedonia supplies none",
};
