// Overview `/`: the 30-second answer, then the argument in story order. Every number comes from the
// data layer; this is not a KPI dashboard (five North Macedonian facts and two comparison panels).
import type { Metadata } from "next";
import Link from "next/link";
import { data, FEATURE_LABEL, nationalPortals, resolveMetric, text } from "@/data";
import { EU_STATEMENT, HERO } from "@/content/copy";
import { OVERVIEW_COPY, OVERVIEW_SECTIONS as O, PAGES } from "@/content/pages";
import type { Cta } from "@/data/types";
import { unitText } from "@/data/format";
import { Chart } from "@/components/charts/Chart";
import { PortalMetricGrid } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MethodologyNote } from "@/components/ui/Notes";
import { ComparabilityBadge, MissingValue, ProjectIndicatorLabel, StateChip } from "@/components/ui/Badges";
import { Evidence } from "@/components/source/Evidence";
import { SourceBadge } from "@/components/source/SourceBadge";
import { AccessMatrix } from "@/components/sections/AccessMatrix";
import { ConclusionPanel, EuAggregatorPanel, FindingsPanel, Hero } from "@/components/sections/Overview";
import statementIndex from "@/data/generated/source-index.json";

export const metadata: Metadata = { title: { absolute: PAGES.overview.title }, description: PAGES.overview.description };

const STATEMENTS = Object.keys((statementIndex as unknown as { statements: Record<string, unknown> }).statements);

export default function OverviewPage() {
  const R = resolveMetric;
  const nationals = nationalPortals();
  const matrixPortals = [...nationals, ...data.portals.filter((p) => p.id === "eu")];
  const eu = R("eu.datasets_total");
  return (
    <div className="frame pt-10 pb-8 lg:pt-14">
      <Hero
        title={HERO.title}
        subtitle={HERO.subtitle}
        description={HERO.description}
        question={HERO.question}
        summary={data.content.summary.text}
        ctas={[OVERVIEW_COPY.ctaPrimary as Cta, OVERVIEW_COPY.ctaSecondary as Cta]}
        snapshot={data.snapshot}
        inShortLabel={OVERVIEW_COPY.inShort}
      />

      {/* A · Key facts */}
      <section aria-labelledby={O.keyFacts.id} className="section">
        <SectionHeader id={O.keyFacts.id} title={O.keyFacts.heading} />
        <PortalMetricGrid
          columns={5}
          facts
          items={[
            { metric: R("mk.datasets_total"), label: "Datasets", emphasis: true },
            { metric: R("mk.resources_total"), label: "Resources" },
            { metric: R("mk.publishers_active"), label: "Active publishers", tooltip: text("activePublishersTooltip"), tooltipEvidence: "text.activePublishersTooltip" },
            { metric: R("mk.organisations_listed"), label: "Listed organisations", caption: text("listedOrganisationsCaption"), captionEvidence: "text.listedOrganisationsCaption" },
            {
              metric: R("mk.datasets_with_theme"),
              label: "Datasets with a theme",
              valueText: text("themedValue"),
              caption: text("themedCaption"),
              captionEvidence: "text.themedCaption",
            },
          ]}
        />
      </section>

      {/* B · Catalogue size */}
      <section aria-labelledby={O.size.id} className="section">
        <SectionHeader id={O.size.id} title={O.size.heading} lead={OVERVIEW_COPY.sizeLead} status="partial" statusReason={OVERVIEW_COPY.sizeReason} />
        <Chart model={data.charts.C1} />
        <div className="mt-6 card p-5" data-counting-differs>
          <h3 className="text-base leading-6">{OVERVIEW_COPY.countingDiffers}</h3>
          <ul className="mt-3 space-y-2 text-[15px] leading-6">
            {[...nationals]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`font-semibold ${p.id === "mk" ? "text-accent" : ""}`}>{p.country}</span>
                  <span className="rounded-full border border-rule px-2 text-xs leading-5 text-ink-muted">{p.unitLabel}</span>
                  <span>{p.unitNote}</span>
                  <SourceBadge layer={null} target={{ metricId: p.headlineMetricId }} label={`View source for ${p.country} catalogue size`} />
                </li>
              ))}
          </ul>
        </div>
        <MethodologyNote href="/methodology#comparability">The EU aggregator and Serbia are never drawn on this axis.</MethodologyNote>
      </section>

      {/* C · EU aggregator */}
      <section aria-labelledby={O.eu.id} className="section">
        <SectionHeader id={O.eu.id} title={O.eu.heading} />
        <EuAggregatorPanel
          total={eu.display}
          unit={unitText(eu.unit, eu.value ?? 0)}
          statement={EU_STATEMENT}
          facts={[
            { key: "prov", text: text("euProvenanceLine"), statement: "text.euProvenanceLine" },
            { key: "hvd", text: text("euHvdLine"), statement: "text.euHvdLine" },
            { key: "largest", text: text("euLargestLine"), statement: "text.euLargestLine" },
            { key: "mk", text: text("euMkLine"), statement: "text.euMkLine" },
          ]}
          euHref="/country/european-union"
          euLinkLabel={OVERVIEW_COPY.euPageLink}
        />
      </section>

      {/* D · What data exists */}
      <section aria-labelledby={O.exists.id} className="section">
        <SectionHeader id={O.exists.id} title={O.exists.heading}>
          <Evidence k="themesLead" className="mt-2 text-[17px] leading-7" />
        </SectionHeader>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Chart model={data.charts.C2} />
          </div>
          <div className="lg:col-span-7">
            <Chart model={data.charts.C3} compact />
          </div>
        </div>
        {/* The local-government share follows a project rule: the chip says so in place. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Evidence k="localGovLine" className="text-[15px] leading-6" />
          <ProjectIndicatorLabel rule="local_government" />
        </div>
        <MethodologyNote href="/methodology#theme-mapping">Counts overlap because datasets can have more than one theme.</MethodologyNote>
      </section>

      {/* E · Reusability */}
      <section aria-labelledby={O.reuse.id} className="section">
        <SectionHeader id={O.reuse.id} title={O.reuse.heading} lead={OVERVIEW_COPY.reuseLead} />
        <div className="mb-4 flex flex-col gap-2 text-sm" data-legend>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink-muted">States:</span>
            <StateChip state="available" />
            <StateChip state="limited" />
            <MissingValue reason="not_reliably_available" withTooltip />
            <MissingValue reason="not_collected" withTooltip />
            <MissingValue reason="not_comparable" withTooltip />
            <MissingValue reason="not_applicable" withTooltip />
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink-muted">Comparability:</span>
            <ComparabilityBadge status="direct" />
            <ComparabilityBadge status="partial" />
            <ComparabilityBadge status="context_only" />
          </p>
        </div>
        <AccessMatrix portals={matrixPortals} cells={data.access} featureLabels={FEATURE_LABEL} caption="Access and reuse features by portal, research snapshot" />
        <p className="mt-4">
          <Link href="/compare" className="font-medium">
            {OVERVIEW_COPY.openComparison}
          </Link>
        </p>
      </section>

      {/* F · Key findings */}
      <section aria-labelledby={O.findings.id} className="section">
        <SectionHeader id={O.findings.id} title={O.findings.heading} lead={OVERVIEW_COPY.findingsLead} />
        <FindingsPanel findings={data.content.findings} readMore={OVERVIEW_COPY.readMore} />
      </section>

      {/* G · Conclusion */}
      <section aria-labelledby={O.conclusion.id} className="section">
        <SectionHeader id={O.conclusion.id} title={O.conclusion.heading} lead={OVERVIEW_COPY.conclusionLead} />
        <ConclusionPanel items={data.content.conclusion} statements={STATEMENTS} readMore={OVERVIEW_COPY.readMore} />
      </section>
    </div>
  );
}
