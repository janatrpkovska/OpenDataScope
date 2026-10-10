// /north-macedonia: the deep dive, sections A–I in order. Every number comes from the data layer.
import type { Metadata } from "next";
import Link from "next/link";
import { data, metric, portal, resolveMetric, text } from "@/data";
import { activePublisherRows, homepageValidation, rawLabelRows, serbiaContextRows } from "@/data/views";
import { DCAT_TEXT, LICENSING_TEXT, METADATA_ACTIVITY_TEXT, PUBLISHER_NEUTRAL_NOTE, THEME_MAPPING_NOTE } from "@/content/copy";
import { NM_COPY, NM_SECTIONS, PAGES } from "@/content/pages";
import { Chart } from "@/components/charts/Chart";
import { PortalMetricGrid, MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionNav } from "@/components/ui/SectionNav";
import { DataTable } from "@/components/ui/DataTable";
import { MethodologyNote } from "@/components/ui/Notes";
import { SnapshotBadge } from "@/components/shell/SnapshotBadge";
import { Evidence } from "@/components/source/Evidence";
import { ViewSource } from "@/components/source/SourceBadge";
import { SerbiaContextPanel } from "@/components/sections/SerbiaContextPanel";
import { InlineComparison, OpportunityList } from "@/components/sections/NmParts";

export const metadata: Metadata = { title: PAGES.northMacedonia.title, description: PAGES.northMacedonia.description };

const S = Object.fromEntries(NM_SECTIONS.map((s) => [s.id, s])) as Record<(typeof NM_SECTIONS)[number]["id"], (typeof NM_SECTIONS)[number]>;
const LEAD = "mt-2 text-[17px] leading-7 text-ink";

export default function NorthMacedoniaPage() {
  const R = resolveMetric;
  const mk = portal("mk");
  const homepage = homepageValidation("mk", "V-mk-homepage");
  const charts = data.charts;
  return (
    <div className="frame pt-10 pb-8 lg:pt-14">
      <header className="max-w-[68ch]">
        <h1>{NM_COPY.h1}</h1>
        <Evidence k="nmLead" className="mt-3 text-lg leading-8 text-ink" />
        <div className="mt-3">
          <SnapshotBadge snapshot={data.snapshot} />
        </div>
      </header>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-12">
        <SectionNav items={NM_SECTIONS.map((s) => ({ id: s.id, label: s.nav }))} />

        <div className="min-w-0">
          {/* A · Catalogue overview */}
          <section aria-labelledby="catalogue-overview" className="section !pt-0">
            <SectionHeader id="catalogue-overview" title={S["catalogue-overview"].heading} />
            <PortalMetricGrid
              columns={3}
              items={[
                { metric: R("mk.datasets_total"), label: "Datasets", emphasis: true },
                { metric: R("mk.resources_total"), label: "Resources", caption: text("resourcesCaption"), derivedId: "mk.resources_per_dataset" },
                {
                  metric: R("mk.publishers_active"),
                  label: "Active publishers",
                  tooltip: text("activePublishersTooltip"),
                  tooltipEvidence: "text.activePublishersTooltip",
                },
                {
                  metric: R("mk.organisations_listed"),
                  label: "Listed organisations",
                  caption: text("listedOrganisationsCaption"),
                  captionEvidence: "text.listedOrganisationsCaption",
                },
                {
                  metric: R("mk.groups_listed"),
                  label: "Groups",
                  valueText: text("groupsValue"),
                  caption: text("groupsCaption"),
                  captionEvidence: "text.groupsCaption",
                },
                {
                  metric: R("mk.ckan_version"),
                  label: "Platform",
                  valueText: mk.platform ?? String(metric("mk.ckan_version").value),
                  caption: text("platformCaption"),
                  captionEvidence: "text.platformCaption",
                },
              ]}
            />
            <p className="mt-4 text-sm leading-6 text-ink-muted" data-homepage-validation>
              <span className="font-medium text-ink">Homepage{homepage.day ? ` on ${homepage.day}` : ""}: </span>
              {homepage.items.map((it, i) => (
                <span key={it.reading.id}>
                  {i > 0 ? " · " : ""}
                  <ViewSource target={{ readingId: it.reading.id }} className="text-sm">
                    {it.text}
                  </ViewSource>
                </span>
              ))}
              <span className="block text-xs">Later validation readings; the canonical values above come from the research snapshot.</span>
            </p>
            <SerbiaContextPanel rows={serbiaContextRows()} />
          </section>

          {/* B · Publishers */}
          <section aria-labelledby="publishers" className="section">
            <SectionHeader id="publishers" title={S.publishers.heading}>
              <Evidence k="participationLead" className={LEAD} />
            </SectionHeader>
            <div className="space-y-6">
              <Chart model={charts.C10} />
              <Chart model={charts.C11} />
            </div>
            <Evidence k="concentrationLine" className="mt-4 text-[15px] leading-6" />
            <div className="mt-6">
              <DataTable
                caption={NM_COPY.publisherTableCaption}
                columns={[
                  { key: "rank", header: "Rank", align: "right" },
                  { key: "publisher", header: "Publisher", primary: true },
                  { key: "original", header: "Original title", lang: "mk" },
                  { key: "type", header: "Type" },
                  { key: "datasets", header: "Datasets", align: "right" },
                  { key: "share", header: "Share of datasets", align: "right" },
                ]}
                rows={activePublisherRows()}
                sortable
                collapsedRows={10}
              />
              <p className="mt-2 text-xs text-ink-muted">
                Source: data.gov.mk organisations and S2 crawl (mk_publishers.csv, mk_publisher_names_en.csv) ·{" "}
                <ViewSource target={{ sourceId: "S2-mk-crawl" }} className="text-xs" /> ·{" "}
                <a href="/data/mk_publishers.csv" download>
                  Download the table
                </a>
              </p>
            </div>
            <MethodologyNote>{PUBLISHER_NEUTRAL_NOTE}</MethodologyNote>
          </section>

          {/* C · Themes */}
          <section aria-labelledby="themes" className="section">
            <SectionHeader id="themes" title={S.themes.heading}>
              <Evidence k="themesLead" className={LEAD} />
            </SectionHeader>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Chart model={charts.C2} />
              </div>
              <div className="lg:col-span-7">
                <Chart model={charts.C3} />
              </div>
              <div className="lg:col-span-12">
                <Chart model={charts.C4} />
                <p className="mt-2 text-sm leading-6 text-ink-muted" data-theme-mapping-note>
                  {THEME_MAPPING_NOTE}
                </p>
              </div>
            </div>
            <MethodologyNote href="/methodology#theme-mapping">
              {NM_COPY.themesOverlapNote} <Evidence k="groupsNote" as="span" />
            </MethodologyNote>
          </section>

          {/* D · Formats */}
          <section aria-labelledby="formats" className="section">
            <SectionHeader id="formats" title={S.formats.heading}>
              <Evidence k="formatsLead" className={LEAD} />
            </SectionHeader>
            <Chart model={charts.C5} />
            <Evidence k="datasetFormatLine" className="mt-4 text-[15px] leading-6" />
            <InlineComparison text={text("nlJsonComparison")} status="direct" statement="text.nlJsonComparison" />
            <details className="card mt-6 p-4 lg:p-5">
              <summary className="cursor-pointer font-semibold">{NM_COPY.rawLabelsSummary}</summary>
              <Evidence k="rawLabelsNote" className="mt-3 text-sm leading-6 text-ink-muted" />
              <div className="mt-3">
                <DataTable
                  caption={NM_COPY.rawLabelsCaption}
                  columns={[
                    { key: "raw", header: "Raw label" },
                    { key: "normalised", header: "Normalised format" },
                    { key: "resources", header: "Resources", align: "right" },
                  ]}
                  rows={rawLabelRows()}
                />
              </div>
            </details>
            <MethodologyNote href="/methodology#format-normalisation">Formats are normalised and classed by the project rule.</MethodologyNote>
          </section>

          {/* E · Machine readability */}
          <section aria-labelledby="machine-readability" className="section">
            <SectionHeader id="machine-readability" title={S["machine-readability"].heading}>
              <Evidence k="machineReadableLead" className={LEAD} />
            </SectionHeader>
            <div className="grid gap-6 lg:grid-cols-2">
              <Chart model={charts.C6} />
              <Chart model={charts.C7} />
            </div>
            <Evidence k="mrDatasetsLine" className="mt-4 text-[15px] leading-6" />
            <MethodologyNote href="/methodology#derived-indicators">Both indicators are project rules, not official ratings or quality scores.</MethodologyNote>
          </section>

          {/* F · Licensing */}
          <section aria-labelledby="licensing" className="section">
            <SectionHeader id="licensing" title={S.licensing.heading}>
              <Evidence k="licensingLead" className={LEAD} />
            </SectionHeader>
            <Chart model={charts.C8} />
            <p className="mt-4 max-w-[68ch] text-[15px] leading-6">{LICENSING_TEXT}</p>
          </section>

          {/* G · Metadata activity */}
          <section aria-labelledby="metadata-activity" className="section">
            <SectionHeader id="metadata-activity" title={S["metadata-activity"].heading}>
              <Evidence k="metadataActivitySubtitle" className={LEAD} />
            </SectionHeader>
            <Chart model={charts.C9} />
            <MethodologyNote href="/methodology#comparability">{METADATA_ACTIVITY_TEXT}</MethodologyNote>
          </section>

          {/* H · EU discoverability */}
          <section aria-labelledby="eu-discoverability" className="section">
            <SectionHeader id="eu-discoverability" title={S["eu-discoverability"].heading}>
              <Evidence k="euMkLine" className={LEAD} />
            </SectionHeader>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4 lg:self-start">
                <MetricCard metric={R("mk.records_on_data_europa_eu")} label="Records on data.europa.eu" zeroEvidence={text("euZeroEvidence")} emphasis />
              </div>
              <div className="lg:col-span-8">
                <Chart model={charts.C12} />
              </div>
            </div>
            <p className="mt-4 max-w-[68ch] text-[15px] leading-6">
              {DCAT_TEXT} <ViewSource target={{ metricId: "mk.ckan_extensions" }} className="text-xs" />
            </p>
          </section>

          {/* I · Opportunities */}
          <section aria-labelledby="opportunities" className="section">
            <SectionHeader
              id="opportunities"
              title={S.opportunities.heading}
              lead="Actions on the catalogue that the evidence above supports. They are not a ranking or a criticism of any body."
            />
            <OpportunityList items={data.content.opportunities} sectionLabels={Object.fromEntries(NM_SECTIONS.map((x) => [x.id, x.nav]))} />
            <p className="mt-6">
              <Link href="/#conclusion" className="font-medium">
                {NM_COPY.readConclusion}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
