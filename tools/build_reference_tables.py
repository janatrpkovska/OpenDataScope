#!/usr/bin/env python3
"""
OpenDataScope: build the reference tables the application reads.

Usage:
    python -I build_reference_tables.py <phase1_dir> <S1_dir> <S2_dir> <out_dir>

Inputs (never modified):
    phase1_dir  the eight final Phase 1 tables (metrics.csv, ...)
    S1_dir      S1 snapshot folder (manifest + raw/)
    S2_dir      snapshot_20261008T230202Z folder (manifest + raw/)

Outputs in out_dir:
    metrics_supplement.csv   report values absent from metrics.csv, re-extracted from raw files
    portals.csv              one row per portal (descriptive, from the Phase 1 report A1-A3, D)
    access_matrix.csv        portal x feature cells; numbers only through {tokens}
    sources.csv              one row per source (API call, page reading, screenshot, document)
    mk_publisher_names_en.csv English display names for the 62 active MK publishers
    theme_labels.csv         EU data-theme codes with full and short English labels
    country_names.csv        names for the provenance codes in eu_provenance.csv

No value is collected from the web. The script fails if any token, source id or
publisher name cannot be resolved.
"""
import csv
import json
import re
import sys
from pathlib import Path

P1, S1, S2, OUT = (Path(a) for a in sys.argv[1:5])
OUT.mkdir(parents=True, exist_ok=True)


def read(name):
    with open(P1 / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def write(name, header, rows):
    with open(OUT / name, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"{name}: {len(rows)} rows")


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


metrics = read("metrics.csv")
METRIC_COLS = list(metrics[0].keys())
by_id = {f"{m['portal_id']}.{m['metric']}": m for m in metrics}

# ---------------------------------------------------------------- supplement
mk_raw = load(S1 / "raw/mk_package_search_2026-10-08.json")["result"]
uk_raw = load(S1 / "raw/uk_package_search_2026-10-08.json")["result"]
us_raw = load(S1 / "raw/us_organizations_2026-10-08.json")
nl_raw = load(S2 / "raw/087_nl_package_search_facets.json")["result"]

mk_lic = {i["name"]: i["count"] for i in mk_raw["search_facets"]["license_id"]["items"]}
nl_fmt = {i["name"]: i["count"] for i in nl_raw["search_facets"]["res_format"]["items"]}
FT = "http://publications.europa.eu/resource/authority/file-type/"
us_top = max(us_raw["organizations"], key=lambda o: o.get("dataset_count") or 0)


def like(base_id, **over):
    row = dict(by_id[base_id])
    row.update(over)
    return [row[c] for c in METRIC_COLS]


supp = [
    like("mk.datasets_open_licence_id", metric="licence_cc_zero", value=mk_lic["cc-zero"],
         count_definition="license_id = cc-zero", comparability_note="Part of datasets_open_licence_id",
         extraction_method="license_id facet ['cc-zero']"),
    like("mk.datasets_open_licence_id", metric="licence_other_open", value=mk_lic["other-open"],
         count_definition="license_id = other-open", comparability_note="Part of datasets_open_licence_id",
         extraction_method="license_id facet ['other-open']"),
    like("mk.datasets_open_licence_id", metric="licence_other_pd", value=mk_lic["other-pd"],
         count_definition="license_id = other-pd", comparability_note="Part of datasets_open_licence_id",
         extraction_method="license_id facet ['other-pd']"),
    like("mk.datasets_open_licence_id", metric="licence_cc_by", value=mk_lic["cc-by"],
         count_definition="license_id = cc-by", comparability_note="Part of datasets_open_licence_id",
         extraction_method="license_id facet ['cc-by']"),
    like("uk.datasets_with_licence_id", metric="format_labels_distinct",
         value=len(uk_raw["search_facets"]["res_format"]["items"]), unit="raw label",
         count_definition="Distinct res_format facet labels (free text)",
         comparability_note="Label variety only; format shares were not collected",
         extraction_method="len(res_format facet)"),
    like("nl.format_values", metric="datasets_with_json", value=nl_fmt[FT + "JSON"], unit="register record",
         count_definition="Records with >=1 resource of file type JSON (res_format facet)",
         comparability_note="Dataset-level presence: comparable with MK datasets offering JSON",
         extraction_method="res_format facet ['.../file-type/JSON']"),
    like("nl.format_values", metric="datasets_with_csv", value=nl_fmt[FT + "CSV"], unit="register record",
         count_definition="Records with >=1 resource of file type CSV (res_format facet)",
         comparability_note="Dataset-level presence: comparable with MK datasets offering CSV",
         extraction_method="res_format facet ['.../file-type/CSV']"),
    like("us.datasets_total", metric="largest_publisher_records", value=us_top["dataset_count"],
         unit="metadata record", role="detail",
         count_definition=f"dataset_count of the largest organisation ({us_top.get('name')})",
         comparability_note="Share of own total only", extraction_method="max(dataset_count)"),
]
for r in supp:
    r[METRIC_COLS.index("status")] = "verified_live"
write("metrics_supplement.csv", METRIC_COLS, supp)
all_ids = set(by_id) | {f"{r[0]}.{r[1]}" for r in supp}

# ---------------------------------------------------------------- portals
PORTALS = [
    # id, slug, country, portal_name, domain, class, url, platform, portal_type, unit_label, unit_note, colour, order
    ("mk", "north-macedonia", "North Macedonia", "data.gov.mk", "data.gov.mk", "national", "https://data.gov.mk/",
     "CKAN 2.10.9", "National catalogue", "datasets",
     "North Macedonia counts public CKAN datasets.", "--portal-mk", 1),
    ("uk", "united-kingdom", "United Kingdom", "data.gov.uk", "data.gov.uk", "national", "https://data.gov.uk/",
     "CKAN", "National directory of links to data hosted elsewhere", "directory records",
     "The United Kingdom counts directory records that link to data hosted elsewhere.", "--portal-national", 2),
    ("us", "united-states", "United States", "data.gov", "data.gov", "national", "https://data.gov/",
     "", "National metadata catalogue, federal and non-federal", "metadata records",
     "The United States counts metadata records, including restricted and non-public access levels.",
     "--portal-national", 3),
    ("de", "germany", "Germany", "GovData", "govdata.de", "national", "https://www.govdata.de/",
     "", "National federated catalogue", "datasets",
     "Germany's figure is the dataset-only count read on the official search page, never the all-results count.",
     "--portal-national", 4),
    ("fr", "france", "France", "data.gouv.fr", "data.gouv.fr", "national", "https://www.data.gouv.fr/",
     "udata", "National catalogue including harvested records", "datasets",
     "France counts datasets only; files and APIs are counted separately, and the homepage's rounded \"76K\" "
     "combines datasets and APIs.", "--portal-national", 5),
    ("nl", "netherlands", "Netherlands", "data.overheid.nl", "data.overheid.nl", "national",
     "https://data.overheid.nl/", "CKAN", "Register of open and non-open government data", "register records",
     "The Netherlands counts register records, including non-public and restricted entries.",
     "--portal-national", 6),
    ("es", "spain", "Spain", "datos.gob.es", "datos.gob.es", "national", "https://datos.gob.es/",
     "", "National federated catalogue", "datasets",
     "Spain's figure is the official homepage indicator, read at a recorded time because no API total exists.",
     "--portal-national", 7),
    ("eu", "european-union", "European Union", "data.europa.eu", "data.europa.eu", "aggregator",
     "https://data.europa.eu/", "", "Aggregator of national and institutional catalogues",
     "aggregated metadata records",
     "The EU portal re-counts records harvested from national and institutional catalogues.", "--portal-eu", 8),
    ("rs", "serbia", "Serbia", "data.gov.rs", "data.gov.rs", "regional_context", "https://data.gov.rs/",
     "udata", "National catalogue, shown as regional context", "datasets",
     "Serbia counts udata datasets and is shown as regional context only.", "--portal-rs", 9),
]
p_rows = []
for (pid, slug, country, pname, dom, cls, url, plat, ptype, unit_label, note, colour, order) in PORTALS:
    head = by_id[f"{pid}.datasets_total"]
    p_rows.append([pid, slug, country, pname, dom, f"{country} · {pname}", cls, str(pid == "mk").lower(),
                   url, plat, ptype, f"{pid}.datasets_total", unit_label, note, head["includes_non_open"],
                   colour, order])
write("portals.csv", ["portal_id", "slug", "country", "portal_name", "domain", "display_name", "portal_class",
                      "is_reference", "url", "platform", "portal_type", "headline_metric_id", "unit_label",
                      "unit_note", "includes_non_open", "color_token", "display_order"], p_rows)

# ---------------------------------------------------------------- sources
S1_TIME = {m["source_url"]: m["retrieved_at_utc"] for m in metrics if m["snapshot_id"] == "S1"}
SOURCES = [
    # id, title, issuer, portals, type, layer, url, url_status, retrieved, raw, used_for
    ("S1-mk-package_search", "data.gov.mk package_search with facets", "data.gov.mk (CKAN API)", "mk",
     "api_snapshot", "S1", by_id["mk.datasets_total"]["source_url"], "recorded", "2026-10-08T22:21:21Z",
     "S1/raw/mk_package_search_2026-10-08.json", "Datasets, active publishers, licence ids, dataset-level labels"),
    ("S1-mk-status_show", "data.gov.mk status_show", "data.gov.mk (CKAN API)", "mk", "api_snapshot", "S1",
     by_id["mk.ckan_version"]["source_url"], "recorded", "2026-10-08T22:21:27Z",
     "S1/raw/mk_status_show_2026-10-08.json", "CKAN version and extensions"),
    ("S1-mk-modified_12m", "data.gov.mk package_search, metadata modified in 365 days", "data.gov.mk (CKAN API)",
     "mk", "api_snapshot", "S1", by_id["mk.records_metadata_modified_12m"]["source_url"], "recorded",
     "2026-10-08T22:21:28Z", "S1/raw/mk_modified_12m_2026-10-08.json", "Metadata activity"),
    ("S2-mk-organization_list", "data.gov.mk organization_list (POST, 6 pages)", "data.gov.mk (CKAN API)", "mk",
     "api_snapshot", "S2", by_id["mk.organisations_listed"]["source_url"], "recorded", "2026-10-08T23:02:04Z",
     "S2/raw/003-008_mk_organization_list_p0*.json", "Listed organisations"),
    ("S2-mk-organization_show", "data.gov.mk organization_show (66 calls)", "data.gov.mk (CKAN API)", "mk",
     "api_snapshot", "S2", "https://data.gov.mk/api/3/action/organization_show", "recorded",
     "2026-10-08T23:02:13Z", "S2/raw/009-074_mk_organization_show_*.json", "Readable publisher titles"),
    ("S2-mk-group_list", "data.gov.mk group_list (POST)", "data.gov.mk (CKAN API)", "mk", "api_snapshot", "S2",
     by_id["mk.groups_listed"]["source_url"], "recorded", "2026-10-08T23:03:32Z",
     "S2/raw/075_mk_group_list_p00.json", "Listed groups"),
    ("S2-mk-crawl", "data.gov.mk package_search crawl, 8 pages of 100", "data.gov.mk (CKAN API)", "mk",
     "api_snapshot", "S2", by_id["mk.resources_total"]["source_url"], "recorded", "2026-10-08T23:03:33Z",
     "S2/raw/076-083_mk_package_search_page0*.json", "Resources, formats, themes, groups, publishers"),
    ("S1-uk-package_search", "data.gov.uk package_search with facets", "data.gov.uk (CKAN API)", "uk",
     "api_snapshot", "S1", by_id["uk.datasets_total"]["source_url"], "recorded", "2026-10-08T22:21:29Z",
     "S1/raw/uk_package_search_2026-10-08.json", "Records, owners, licence ids, format labels"),
    ("S1-uk-organization_list", "data.gov.uk organization_list", "data.gov.uk (CKAN API)", "uk", "api_snapshot",
     "S1", by_id["uk.organisations_listed"]["source_url"], "recorded", "2026-10-08T22:21:31Z",
     "S1/raw/uk_organization_list_2026-10-08.json", "Listed organisations"),
    ("S1-uk-modified_12m", "data.gov.uk package_search, metadata modified in 365 days", "data.gov.uk (CKAN API)",
     "uk", "api_snapshot", "S1", by_id["uk.records_metadata_modified_12m"]["source_url"], "recorded",
     "2026-10-08T22:21:32Z", "S1/raw/uk_modified_12m_2026-10-08.json", "Metadata activity"),
    ("S1-eu-search", "data.europa.eu search API, datasets with facets", "data.europa.eu", "eu;mk;uk;de;fr;nl;es;rs",
     "api_snapshot", "S1", by_id["eu.datasets_total"]["source_url"], "recorded", "2026-10-08T22:22:33Z",
     "S1/raw/eu_search_datasets_2026-10-08.json", "Aggregated records, HVD, themes, provenance, catalogue copies"),
    ("S1-us-organizations", "catalog.data.gov organisations API", "data.gov (Catalog API)", "us", "api_snapshot",
     "S1", by_id["us.datasets_total"]["source_url"], "recorded", "2026-10-08T22:22:35Z",
     "S1/raw/us_organizations_2026-10-08.json", "Metadata records, organisations, concentration"),
    ("S1-fr-site", "data.gouv.fr site metrics API", "data.gouv.fr (udata API)", "fr", "api_snapshot", "S1",
     by_id["fr.datasets_total"]["source_url"], "recorded", "2026-10-08T22:22:36Z",
     "S1/raw/fr_site_2026-10-08.json", "Datasets, resources, data services, organisations"),
    ("S1-fr-hvd", "data.gouv.fr datasets tagged hvd", "data.gouv.fr (udata API)", "fr", "api_snapshot", "S1",
     by_id["fr.hvd_datasets"]["source_url"], "recorded", "2026-10-08T22:22:37Z",
     "S1/raw/fr_hvd_2026-10-08.json", "HVD datasets"),
    ("S2-de-govdata-reading", "GovData dataset search, dataset-only count read by the researcher",
     "GovData", "de", "page_reading", "S2", by_id["de.datasets_total"]["source_url"], "recorded",
     "2026-10-08T23:02:02Z", "", "Germany's canonical dataset count (entered at the start of S2)"),
    ("S2-nl-package_search", "data.overheid.nl package_search with facets", "data.overheid.nl (CKAN API)", "nl",
     "api_snapshot", "S2", by_id["nl.datasets_total"]["source_url"], "recorded", "2026-10-08T23:03:48Z",
     "S2/raw/087_nl_package_search_facets.json", "Records, licences, source organisations, formats"),
    ("S2-nl-modified_12m", "data.overheid.nl package_search, metadata modified in 365 days",
     "data.overheid.nl (CKAN API)", "nl", "api_snapshot", "S2",
     by_id["nl.records_metadata_modified_12m"]["source_url"], "recorded", "2026-10-08T23:03:49Z",
     "S2/raw/088_nl_modified_12m.json", "Metadata activity"),
    ("S2-rs-site", "data.gov.rs site metrics API", "data.gov.rs (udata API)", "rs", "api_snapshot", "S2",
     by_id["rs.datasets_total"]["source_url"], "recorded", "2026-10-08T23:03:52Z",
     "S2/raw/090_rs_udata_site.json", "Regional context metrics"),
    ("R1-es-homepage", "datos.gob.es homepage indicator \"Conjuntos de datos\"", "datos.gob.es", "es",
     "page_reading", "R1", by_id["es.datasets_total"]["source_url"], "recorded",
     "2026-10-08T22:32:14Z/2026-10-08T22:34:30Z", "", "Spain's canonical dataset count"),
    # later manual screenshots (validation)
    ("V-mk-homepage", "data.gov.mk homepage", "data.gov.mk", "mk", "manual_screenshot", "V", "https://data.gov.mk/",
     "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-mk-search", "data.gov.mk dataset search", "data.gov.mk", "mk", "manual_screenshot", "V", "", "not_recorded",
     "2026-10-09, before 11:13Z", "", "Visual validation"),
    ("V-uk-package_search", "data.gov.uk package_search", "data.gov.uk", "uk", "manual_screenshot", "V",
     "https://data.gov.uk/api/action/package_search", "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-uk-organization_list", "data.gov.uk organization_list (HTTP 504)", "data.gov.uk", "uk", "manual_screenshot",
     "V", "https://data.gov.uk/api/action/organization_list", "recorded", "2026-10-09, before 11:13Z", "",
     "Validation (timeout)"),
    ("V-us-homepage", "data.gov homepage", "data.gov", "us", "manual_screenshot", "V", "https://data.gov/",
     "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-eu-search", "data.europa.eu dataset search", "data.europa.eu", "eu", "manual_screenshot", "V",
     "https://data.europa.eu/data/datasets", "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-de-search", "GovData search (datasets and all results)", "GovData", "de", "manual_screenshot", "V",
     "https://www.govdata.de/", "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-fr-homepage", "data.gouv.fr homepage", "data.gouv.fr", "fr", "manual_screenshot", "V",
     "https://www.data.gouv.fr/", "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-nl-datasets", "data.overheid.nl dataset page (state and publicity)", "data.overheid.nl", "nl",
     "manual_screenshot", "V", "https://data.overheid.nl/en/datasets", "recorded", "2026-10-09, before 11:13Z", "",
     "Validation"),
    ("V-es-homepage", "datos.gob.es homepage", "datos.gob.es", "es", "manual_screenshot", "V", "https://datos.gob.es/",
     "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-es-catalogue", "datos.gob.es catalogue", "datos.gob.es", "es", "manual_screenshot", "V",
     "https://datos.gob.es/en/catalogo", "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    ("V-rs-homepage", "data.gov.rs homepage", "data.gov.rs", "rs", "manual_screenshot", "V", "https://data.gov.rs/",
     "recorded", "2026-10-09, before 11:13Z", "", "Validation"),
    # earlier readings (validation)
    ("E-us-homepage", "data.gov homepage (earlier reading)", "data.gov", "us", "page_reading", "earlier",
     "https://data.gov/", "recorded", "2026-10-08T05:00:30Z (page update time)", "", "Validation"),
    ("E-eu-homepage", "data.europa.eu homepage (earlier reading)", "data.europa.eu", "eu", "page_reading", "earlier",
     "https://data.europa.eu/en", "recorded", "2026-10-08 21:46-22:20Z window", "", "Validation"),
    ("E-es-homepage", "datos.gob.es homepage (earlier reading)", "datos.gob.es", "es", "page_reading", "earlier",
     "https://datos.gob.es/en", "recorded", "2026-10-08 21:46-22:20Z window", "", "Validation"),
    ("E-nl-datasets", "data.overheid.nl dataset page (earlier reading, R1)", "data.overheid.nl", "nl",
     "page_reading", "earlier", "https://data.overheid.nl/en/datasets", "recorded",
     "2026-10-08T22:32:14Z/2026-10-08T22:34:30Z", "", "Validation; HVD category and theme counts"),
    ("E-de-earlier", "GovData (earlier reading, record type not separated)", "GovData", "de", "page_reading",
     "earlier", "https://www.govdata.de/", "recorded", "<= 2026-10-08T22:47Z", "", "Validation (superseded)"),
    # documentation (structural evidence); URLs are the hyperlinks embedded in the final Phase 1 research report
    ("DOC-uk-api", "data.gov.uk API guidance", "Government Digital Service", "uk", "documentation", "docs",
     "https://guidance.data.gov.uk/get_data/api_documentation/", "recorded", "", "", "API access"),
    ("DOC-us-api", "data.gov Catalog API documentation", "data.gov", "us", "documentation", "docs",
     "https://resources.data.gov/catalog-api/", "recorded", "", "", "API key requirement; DCAT-US 3.0; licence field"),
    ("DOC-nl-api", "data.overheid.nl API documentation", "data.overheid.nl", "nl", "documentation", "docs",
     "https://data.overheid.nl/en/ondersteuning/data-publiceren/api", "recorded", "", "", "API access; DCAT-AP-DONL"),
    ("DOC-es-api", "datos.gob.es API and SPARQL documentation", "datos.gob.es", "es", "documentation", "docs",
     "https://datos.gob.es/en/apidata", "recorded", "", "", "API access; DCAT-AP-ES"),
    ("DOC-eu-manual", "data.europa.eu API and SPARQL manual", "data.europa.eu", "eu", "documentation", "docs",
     "https://dataeuropa.gitlab.io/data-provider-manual/how-to-search/search-for-datasets/", "recorded", "", "",
     "API access; DCAT-AP"),
    ("DOC-odm-2025", "Open Data Maturity 2025 report", "data.europa.eu (European Commission)", "mk;de;nl;es;rs",
     "report", "docs", "https://data.europa.eu/sites/default/files/2025-12/2025_odm_report_6.pdf", "recorded", "", "",
     "Maturity clusters; Germany's SPARQL endpoint"),
    ("DOC-odm-2025-mk", "Open Data Maturity 2025 factsheet: North Macedonia", "data.europa.eu (European Commission)",
     "mk", "report", "docs", "https://data.europa.eu/sites/default/files/2025-12/2025_odm_factsheet_north_macedonia.pdf",
     "recorded", "", "", "Self-reported answers"),
    ("DOC-gds-blog", "GDS blog post on data.gov.uk link quality", "Government Digital Service", "uk", "documentation",
     "docs", "https://dataingovernment.blog.gov.uk/2026/03/25/whats-changing-on-data-gov-uk-and-why/", "recorded", "",
     "", "At least 25 % broken links"),
    # internal project document: it has no external URL by design
    ("P1-report", "OpenDataScope Final Phase 1 Research Report (sections A3, D)", "OpenDataScope project",
     "mk;uk;us;de;fr;nl;es;eu;rs", "report", "docs", "", "internal_project_document", "2026-10-09", "",
     "Access-matrix facts whose underlying document was not itemised"),
]
URL_STATUSES = {"recorded", "not_recorded", "internal_project_document"}
assert all(s[7] in URL_STATUSES for s in SOURCES), "unknown url_status"
assert all(bool(s[6]) == (s[7] == "recorded") for s in SOURCES), "url and url_status disagree"
DOC_IDS = {"DOC-uk-api", "DOC-us-api", "DOC-nl-api", "DOC-es-api", "DOC-eu-manual", "DOC-odm-2025",
           "DOC-odm-2025-mk", "DOC-gds-blog"}
assert all(s[7] == "recorded" and s[6].startswith("https://") for s in SOURCES if s[0] in DOC_IDS), \
    "an external documentation source lacks its recorded URL"
assert [s[7] for s in SOURCES if s[0] == "P1-report"] == ["internal_project_document"]
write("sources.csv", ["source_id", "title", "issuer", "portal_ids", "source_type", "layer", "url", "url_status",
                      "retrieved_at", "raw_file", "used_for"], [list(s) for s in SOURCES])
SRC_IDS = {s[0] for s in SOURCES}
# every canonical source_url must map to a source row
src_by_url = {s[6]: s[0] for s in SOURCES if s[6] and s[5] in ("S1", "S2", "R1")}
missing = {m["source_url"] for m in metrics} - set(src_by_url)
assert not missing, f"metric source_url without a source row: {missing}"

# ---------------------------------------------------------------- access matrix
A = []  # portal, feature, state, display_value, comparability, reason, layer, sources, note


def cell(p, f, state, text, comp="", why="", layer="", src="", note=""):
    A.append([p, f, state, text, comp, why, layer, src, note])


API_WHY = "Whether a public metadata API exists is the same yes/no question everywhere; API types differ."
MA_WHY = "Same CKAN metadata_modified query on North Macedonia, the United Kingdom and the Netherlands."
LIC_WHY = "Same CKAN license_id field in North Macedonia and the Netherlands."
FMT_WHY = "Share of records offering at least one JSON or CSV resource: same dataset-level measure in MK and NL."
PUB_WHY = "Active means owning at least one record; the UK, US and MK definitions are close but not identical."
NO_HVD = "EU High-Value Datasets rules do not apply"
# North Macedonia
cell("mk", "api", "available", "CKAN Action API, no key; organisation and group lists require POST", "direct",
     API_WHY, "S1", "S1-mk-package_search;S2-mk-organization_list")
cell("mk", "formats", "available",
     "JSON in {d:mk.json_datasets_pct} and CSV in {d:mk.csv_datasets_pct} of datasets; "
     "{pct2:mk.machine_readable_resources/mk.resources_total} of resources machine-readable (project rule)",
     "direct", FMT_WHY, "S2", "S2-mk-crawl", "Resource-level indicators are project-defined")
cell("mk", "metadata_standard", "limited", "DCAT-AP extension installed (mk_dcatap); record exposure not verified",
     "context_only", "Installed extensions show capability, not use.", "S1", "S1-mk-status_show")
cell("mk", "licensing", "limited",
     "{pct:mk.datasets_open_licence_id/mk.datasets_total} carry an open-licence id; "
     "{pct:mk.datasets_licence_not_specified/mk.datasets_total} 'not specified'; "
     "{pct:mk.datasets_no_licence_id/mk.datasets_total} none", "direct", LIC_WHY, "S1", "S1-mk-package_search")
cell("mk", "hvd", "not_applicable", NO_HVD, "", "", "docs", "P1-report")
cell("mk", "publishers", "available", "{v:mk.publishers_active} active of {v:mk.organisations_listed} listed",
     "partial", PUB_WHY, "S1", "S1-mk-package_search;S2-mk-organization_list")
cell("mk", "metadata_activity", "available",
     "{pct:mk.records_metadata_modified_12m/mk.datasets_total} of records", "direct", MA_WHY, "S1",
     "S1-mk-modified_12m")
cell("mk", "themes", "available",
     "{d:mk.themes_used} EU data-theme codes on {pct:mk.datasets_with_theme/mk.datasets_total} of datasets",
     "partial", "Same EU vocabulary as the EU portal; other portals use national schemes.", "S2", "S2-mk-crawl")
# United Kingdom
cell("uk", "api", "available", "CKAN Action API, no key", "direct", API_WHY, "S1", "S1-uk-package_search;DOC-uk-api")
cell("uk", "formats", "not_collected",
     "Format shares not collected; the format facet holds {v:uk.format_labels_distinct} free-text labels", "", "",
     "S1", "S1-uk-package_search")
cell("uk", "metadata_standard", "not_reliably_available", "No metadata standard documented", "", "", "docs",
     "DOC-uk-api")
cell("uk", "licensing", "limited",
     "{pct:uk.datasets_with_licence_id/uk.datasets_total} of records have any license_id; licences may sit in "
     "other fields", "partial", "Counts any licence id, not only open licences.", "S1", "S1-uk-package_search")
cell("uk", "hvd", "not_applicable", NO_HVD, "", "", "docs", "P1-report")
cell("uk", "publishers", "available",
     "{v:uk.publishers_active} owners of indexed records ({v:uk.organisations_listed} listed)", "partial",
     PUB_WHY, "S1", "S1-uk-package_search;S1-uk-organization_list",
     "147 indexed owners are missing from the list; 15 listed organisations own no record")
cell("uk", "metadata_activity", "available",
     "{pct:uk.records_metadata_modified_12m/uk.datasets_total} of records", "direct", MA_WHY, "S1",
     "S1-uk-modified_12m")
cell("uk", "themes", "limited", "14 directory topics and 6 curated collections; counts not collected",
     "context_only", "National topic scheme, not the EU vocabulary.", "docs", "P1-report")
# United States
cell("us", "api", "available", "Catalog API v4; API key required", "direct", API_WHY, "S1",
     "S1-us-organizations;DOC-us-api")
cell("us", "formats", "not_collected", "Not collected")
cell("us", "metadata_standard", "available", "DCAT-US 3.0", "context_only", "National profile.", "docs",
     "DOC-us-api")
cell("us", "licensing", "not_collected", "Licence field per record (optional); coverage not collected", "", "",
     "docs", "DOC-us-api")
cell("us", "hvd", "not_applicable", NO_HVD, "", "", "docs", "P1-report")
cell("us", "publishers", "available",
     "{v:us.publishers_active} active of {v:us.organisations_listed} listed; federal sources hold "
     "{v:us.federal_share_pct} of records", "partial", PUB_WHY, "S1", "S1-us-organizations")
cell("us", "metadata_activity", "not_collected", "Not measured with the common CKAN query")
cell("us", "themes", "not_applicable", "No portal-wide theme list", "", "", "S1", "P1-report")
# Germany
cell("de", "api", "available", "SPARQL endpoint (reported in ODM 2025)", "direct", API_WHY, "docs", "DOC-odm-2025")
cell("de", "formats", "not_collected", "Not collected")
cell("de", "metadata_standard", "not_collected", "Not collected")
cell("de", "licensing", "not_collected", "Not collected")
cell("de", "hvd", "not_collected", "Shown on the homepage but not transcribed")
cell("de", "publishers", "not_collected", "Not collected: the site disallows automated access")
cell("de", "metadata_activity", "not_collected", "Not measured with the common CKAN query")
cell("de", "themes", "not_collected", "Not collected")
# France
cell("fr", "api", "available", "REST API /api/1/, no key; SPARQL available", "direct", API_WHY, "S1",
     "S1-fr-site;P1-report")
cell("fr", "formats", "not_collected",
     "{v:fr.resources_total} files counted separately; format shares not collected", "", "", "S1", "S1-fr-site")
cell("fr", "metadata_standard", "available", "DCAT-AP", "context_only", "European profile.", "docs", "P1-report")
cell("fr", "licensing", "not_collected", "Licence per dataset; coverage not collected", "", "", "docs", "P1-report")
cell("fr", "hvd", "available", "{v:fr.hvd_datasets} datasets tagged hvd", "context_only",
     "A tag count on one portal; the EU portal counts flagged aggregated records.", "S1", "S1-fr-hvd")
cell("fr", "publishers", "limited", "{v:fr.organizations_total} registered organisations; active count not collected",
     "context_only", "Registered, not active, organisations.", "S1", "S1-fr-site")
cell("fr", "metadata_activity", "not_collected", "Not measured with the common CKAN query")
cell("fr", "themes", "not_applicable", "No fixed theme facet", "", "", "S1", "P1-report")
# Netherlands
cell("nl", "api", "available", "CKAN API v3, no key", "direct", API_WHY, "S2", "S2-nl-package_search;DOC-nl-api")
cell("nl", "formats", "available",
     "JSON in {pct:nl.datasets_with_json/nl.datasets_total} and CSV in {pct:nl.datasets_with_csv/nl.datasets_total} "
     "of records; controlled EU vocabulary ({v:nl.format_values} values)", "direct", FMT_WHY, "S2",
     "S2-nl-package_search")
cell("nl", "metadata_standard", "available", "DCAT-AP-DONL", "context_only", "National profile of DCAT-AP.", "docs",
     "DOC-nl-api")
cell("nl", "licensing", "available", "{pct:nl.datasets_open_licence_id/nl.datasets_total} carry an open-licence id",
     "direct", LIC_WHY, "S2", "S2-nl-package_search", "The register also contains non-public records")
cell("nl", "hvd", "not_collected", "Not in the snapshot; an earlier page reading showed 197 HVD category assignments",
     "", "", "earlier", "E-nl-datasets", "Earlier readings are validation only, so no main value is shown")
cell("nl", "publishers", "limited",
     "{v:nl.source_organisations} source catalogues in the CKAN facet; data owners sit in a separate field",
     "context_only", "Source catalogues are not publishers.", "S2", "S2-nl-package_search")
cell("nl", "metadata_activity", "available",
     "{pct:nl.records_metadata_modified_12m/nl.datasets_total} of records", "direct", MA_WHY, "S2",
     "S2-nl-modified_12m")
cell("nl", "themes", "limited", "17 national OWMS themes; counts only from an earlier page reading", "context_only",
     "National theme scheme.", "earlier", "E-nl-datasets")
# Spain
cell("es", "api", "available", "Linked-data API and SPARQL", "direct", API_WHY, "docs", "DOC-es-api")
cell("es", "formats", "not_collected", "Not collected")
cell("es", "metadata_standard", "available", "DCAT-AP-ES", "context_only", "National profile of DCAT-AP.", "docs",
     "DOC-es-api")
cell("es", "licensing", "not_collected", "Licence per dataset; coverage not collected", "", "", "docs", "P1-report")
cell("es", "hvd", "not_collected", "An HVD filter exists; the count was not collected", "", "", "V", "P1-report")
cell("es", "publishers", "not_reliably_available", "No publisher total on the official source", "", "", "R1",
     "R1-es-homepage")
cell("es", "metadata_activity", "not_collected", "Not measured with the common CKAN query")
cell("es", "themes", "limited", "NTI primary-sector taxonomy; counts not collected", "context_only",
     "National theme scheme.", "docs", "P1-report")
# EU aggregator
cell("eu", "api", "available", "Search API and SPARQL", "direct", API_WHY, "S1", "S1-eu-search;DOC-eu-manual")
cell("eu", "formats", "not_collected", "Not collected")
cell("eu", "metadata_standard", "available", "DCAT-AP", "context_only", "European profile.", "docs", "DOC-eu-manual")
cell("eu", "licensing", "not_collected", "Licence per record; coverage not collected", "", "", "docs", "DOC-eu-manual")
cell("eu", "hvd", "available", "{v:eu.hvd_records} records flagged HVD", "context_only",
     "Aggregated records, not one national catalogue.", "S1", "S1-eu-search")
cell("eu", "publishers", "limited", "{d:eu.provenance_values} provenance values; catalogue count not reliably available",
     "context_only", "Provenance values are not publishers.", "S1", "S1-eu-search")
cell("eu", "metadata_activity", "not_collected", "Not measured with the common CKAN query")
cell("eu", "themes", "available",
     "13 EU data themes, {v:eu.theme_assignments} assignments; at least 457,019 records carry none",
     "partial", "Same EU vocabulary as North Macedonia, measured on aggregated records.", "S1", "S1-eu-search")
# Serbia (regional context)
cell("rs", "api", "available", "udata API /api/1/", "context_only", "Regional context only.", "S2", "S2-rs-site")
for f in ("formats", "metadata_standard", "licensing", "hvd", "metadata_activity", "themes"):
    cell("rs", f, "not_collected", "Not collected")
cell("rs", "publishers", "limited", "{v:rs.organizations_total} registered organisations", "context_only",
     "Regional context only; registered, not active.", "S2", "S2-rs-site")

DERIVED = {"mk.json_datasets_pct", "mk.csv_datasets_pct", "mk.themes_used", "eu.provenance_values"}
TOKEN = re.compile(r"\{(v|pct|pct2|d):([^}]+)\}")
rows = []
for p, f, state, text, comp, why, layer, src, note in A:
    ids = []
    for kind, ref in TOKEN.findall(text):
        parts = ref.split("/") if kind in ("pct", "pct2") else [ref]
        for part in parts:
            ok = part in DERIVED if kind == "d" else part in all_ids
            assert ok, f"unresolved token {kind}:{part} in {p}.{f}"
            ids.append(part if kind != "d" else f"derived.{part}")
    for s in filter(None, src.split(";")):
        assert s in SRC_IDS, f"unknown source {s} in {p}.{f}"
    if state in ("available", "limited"):
        assert comp, f"{p}.{f}: a value cell needs a comparability status"
    rows.append([p, f, state, text, ";".join(dict.fromkeys(ids)), comp, why, layer, src, note])
assert len(rows) == 9 * 8, len(rows)
write("access_matrix.csv", ["portal_id", "feature", "state", "display_value", "metric_ids", "comparability",
                            "comparability_reason", "layer", "source_ids", "note"], rows)

# ---------------------------------------------------------------- MK publisher names (English)
NAMES = {
    "Општина Карпош": ("Municipality of Karpoš", "transliterated"),
    "Општина Демир Хисар": ("Municipality of Demir Hisar", "transliterated"),
    "Општина Гази Баба": ("Municipality of Gazi Baba", "transliterated"),
    "МВР": ("Ministry of Internal Affairs", "abbreviation_expanded"),
    "Агенција за администрација на РСМ": ("Agency for Administration of North Macedonia", "translated"),
    "Општина Валандово": ("Municipality of Valandovo", "transliterated"),
    "МЖСПП": ("Ministry of Environment and Physical Planning", "abbreviation_expanded"),
    "Општина Крушево": ("Municipality of Kruševo", "transliterated"),
    "Влада на Република Северна Македонија": ("Government of the Republic of North Macedonia", "translated"),
    "Општина Конче": ("Municipality of Konče", "transliterated"),
    "Општина Крива Паланка": ("Municipality of Kriva Palanka", "transliterated"),
    "Министерство за социјална политика, демографија и млади":
        ("Ministry of Social Policy, Demography and Youth", "translated"),
    "Општина Демир Капија": ("Municipality of Demir Kapija", "transliterated"),
    "Министерство за финансии": ("Ministry of Finance", "translated"),
    "Општина Новаци": ("Municipality of Novaci", "transliterated"),
    "Општина Лозово": ("Municipality of Lozovo", "transliterated"),
    "Општина Гевгелија": ("Municipality of Gevgelija", "transliterated"),
    "Град Скопје": ("City of Skopje", "translated"),
    "Општина Дојран": ("Municipality of Dojran", "transliterated"),
    "Државен инспекторат за земјоделство": ("State Agriculture Inspectorate", "translated"),
    "ЈП Хидросистем Злетовица": ("Public Enterprise Hydrosystem Zletovica", "translated"),
    "АВРСМ": ("Employment Service Agency of North Macedonia", "abbreviation_expanded"),
    "Државен пазарен инспекторат": ("State Market Inspectorate", "translated"),
    "Државен инспекторат за градежништво и урбанизам":
        ("State Inspectorate for Construction and Urbanism", "translated"),
    "Управа за јавни приходи": ("Public Revenue Office", "translated"),
    "ЈП Студенчица Кичево": ("Public Enterprise Studenčica, Kičevo", "translated"),
    "МДТ": ("Ministry of Digital Transformation", "abbreviation_expanded"),
    "Министерство за економија": ("Ministry of Economy", "translated"),
    "Општина Битола": ("Municipality of Bitola", "transliterated"),
    "Општина Теарце": ("Municipality of Tearce", "transliterated"),
    "Биро за јавни набавки": ("Public Procurement Bureau", "translated"),
    "ЈП ЖРСМ Инфраструктура": ("Public Enterprise North Macedonian Railways Infrastructure", "abbreviation_expanded"),
    "Дирекција за радијациона сигурност": ("Radiation Safety Directorate", "translated"),
    "Општина Куманово": ("Municipality of Kumanovo", "transliterated"),
    "Општина Тетово": ("Municipality of Tetovo", "transliterated"),
    "Агенција за катастар на недвижности": ("Agency for Real Estate Cadastre", "translated"),
    "ЈП Службен весник на РСМ": ("Public Enterprise Official Gazette of North Macedonia", "translated"),
    "Министерство за земјоделство, шумарство и водостопанство":
        ("Ministry of Agriculture, Forestry and Water Economy", "translated"),
    "Агенција за филм на Република Северна Македонија": ("Film Agency of North Macedonia", "translated"),
    "Агенција за храна и ветеринарство": ("Food and Veterinary Agency", "translated"),
    "АФПЗРР": ("Agency for Financial Support in Agriculture and Rural Development", "abbreviation_expanded"),
    "Државна комисија за спречување на корупцијата": ("State Commission for Prevention of Corruption", "translated"),
    "Инспекциски совет на РСМ": ("Inspection Council of North Macedonia", "translated"),
    "AINOW Society": ("AINOW Society", "kept"),
    "Агенција за заштита на правото на слободен пристап до информациите од јавен карактер":
        ("Agency for the Protection of the Right to Free Access to Public Information", "translated"),
    "Агенција за лекови и медицински средства": ("Agency for Medicines and Medical Devices", "translated"),
    "АЕК": ("Agency for Electronic Communications", "abbreviation_expanded"),
    "Град Скопје - Заштита на животната средина": ("City of Skopje: Environmental Protection", "translated"),
    "Државен завод за статистика": ("State Statistical Office", "translated"),
    "Државен Управен Инспекторат": ("State Administrative Inspectorate", "translated"),
    "Државно правобранителство на РСМ": ("State Attorney's Office of North Macedonia", "translated"),
    "Министерство за здравство": ("Ministry of Health", "translated"),
    "Министерство за правда": ("Ministry of Justice", "translated"),
    "Агенција за поттикнување на развојот на земјоделството":
        ("Agency for the Promotion of Agricultural Development", "translated"),
    "Државен завод за ревизија": ("State Audit Office", "translated"),
    "ЈП Агро берза": ("Public Enterprise Agro Exchange", "translated"),
    "ЈП Стрежево": ("Public Enterprise Streževo", "transliterated"),
    "ЈПВ Лисиче": ("Public Water Management Enterprise “Lisiče” – Veles", "abbreviation_expanded"),
    "Министерство за економија и труд": ("Ministry of Economy and Labour", "translated"),
    "Министерство за образование и наука": ("Ministry of Education and Science", "translated"),
    "Царинска управа на Република Северна Македонија":
        ("Customs Administration of the Republic of North Macedonia", "translated"),
    "ЦРСМ": ("Central Registry of the Republic of North Macedonia", "abbreviation_expanded"),
}
REVIEW = set()  # the two expansions (ЈПВ Лисиче, ЦРСМ) were confirmed by the project author on 9 Oct 2026
pubs = read("mk_publishers.csv")
active = [p for p in pubs if p["active"] == "True"]
assert len(active) == 62 and set(p["title"] for p in active) == set(NAMES), "publisher names incomplete"
write("mk_publisher_names_en.csv", ["org_name", "title_original", "title_en", "translation_method", "needs_review"],
      [[p["org_name"], p["title"], *NAMES[p["title"]], str(p["title"] in REVIEW).lower()] for p in active])
assert not REVIEW, "publisher names still marked for review"

# ---------------------------------------------------------------- theme labels
SHORT = {"GOVE": "Government", "ECON": "Economy and finance", "REGI": "Regions and cities",
         "AGRI": "Agriculture and food", "SOCI": "Population and society", "EDUC": "Education, culture, sport",
         "ENVI": "Environment", "JUST": "Justice and safety", "TRAN": "Transport", "HEAL": "Health",
         "ENER": "Energy", "TECH": "Science and technology", "INTR": "International issues", "(none)": "No theme"}
themes = read("mk_themes.csv")
assert set(t["theme_code"] for t in themes) == set(SHORT)
write("theme_labels.csv", ["theme_code", "theme_name", "short_label"],
      [[("NONE" if t["theme_code"] == "(none)" else t["theme_code"]), t["theme_name"], SHORT[t["theme_code"]]]
       for t in themes])

# ---------------------------------------------------------------- country names
CN = {"de": "Germany", "fr": "France", "es": "Spain", "it": "Italy", "gb": "United Kingdom", "at": "Austria",
      "EUROPE": "EUROPE (portal label)", "cz": "Czechia", "nl": "Netherlands", "pl": "Poland", "se": "Sweden",
      "ie": "Ireland", "gr": "Greece", "pt": "Portugal", "be": "Belgium", "ch": "Switzerland", "bg": "Bulgaria",
      "no": "Norway", "si": "Slovenia", "ee": "Estonia", "ua": "Ukraine", "ro": "Romania", "hr": "Croatia",
      "dk": "Denmark", "lu": "Luxembourg", "rs": "Serbia", "fi": "Finland", "lt": "Lithuania", "hu": "Hungary",
      "sk": "Slovakia", "lv": "Latvia", "cy": "Cyprus", "md": "Moldova", "me": "Montenegro", "mt": "Malta",
      "is": "Iceland", "li": "Liechtenstein", "al": "Albania", "mk": "North Macedonia"}
prov = read("eu_provenance.csv")
assert set(p["country_code"] for p in prov) == set(CN)
write("country_names.csv", ["country_code", "name"], [[p["country_code"], CN[p["country_code"]]] for p in prov])
print("all checks passed")
