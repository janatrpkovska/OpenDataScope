// /country/[slug]: one template for the 8 portals other than North Macedonia. Static; unknown
// slugs are a 404 (dynamicParams = false); /country/north-macedonia redirects to /north-macedonia.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { data, FEATURE_LABEL, portalBySlug, resolveMetric, sourcesFor } from "@/data";
import { countryView } from "@/data/views";
import { layerTime } from "@/data/charts";
import type { PortalId } from "@/data/types";
import { COUNTRY_COPY as T, INCLUDES_NON_OPEN_TEXT } from "@/content/country";
import { THEME_MAPPING_NOTE } from "@/content/copy";
import { countryDescription, countryTitle } from "@/content/pages";
import { metricLabel } from "@/content/metricLabels";
import { Breadcrumb } from "@/components/shell/Breadcrumb";
import { SnapshotBadge } from "@/components/shell/SnapshotBadge";
import { ClassBadge, ComparabilityBadge } from "@/components/ui/Badges";
import { MetricCard, PortalMetricGrid } from "@/components/ui/MetricCard";
import { MethodologyNote } from "@/components/ui/Notes";
import { ViewSource } from "@/components/source/SourceBadge";
import { Chart } from "@/components/charts/Chart";
import { AccessMatrix, ACCESS_FEATURES } from "@/components/sections/AccessMatrix";
import { ContextBanner, PortalCard, SourceList, TextSection } from "@/components/sections/CountryParts";
import { ProvenanceTable, ValidationTable } from "@/components/sections/CountryTables";

export const dynamicParams = false;

export function generateStaticParams() {
  return data.portals.filter((p) => p.id !== "mk").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = portalBySlug(slug);
  if (!p) return {};
  return { title: countryTitle(p.country, p.portalName), description: countryDescription(p.country, p.domain) };
}

const HIDDEN_LABEL: Record<string, string> = {
  glance: T.glance,
  publishers: T.publishers,
  themes: T.themes,
  validation: T.validation,
};

export default async function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = portalBySlug(slug);
  if (!p || p.id === "mk") notFound();
  const id = p.id as PortalId;
  const head = resolveMetric(p.headlineMetricId);
  const view = countryView(id);
  const national = p.portalClass === "national";
  const compareHref =
    p.portalClass === "aggregator"
      ? "/compare?portals=mk,uk,us,nl&eu=1&rs=0"
      : p.portalClass === "regional_context"
        ? "/compare?portals=mk,uk,us,nl&eu=0&rs=1"
        : `/compare?portals=mk,${id}&eu=0&rs=0`;
  const others = data.portals.filter((x) => x.id !== id);
  return (
    <div className="frame pt-8 pb-8 lg:pt-12">
      {/* 0 · Header */}
      <Breadcrumb items={[{ label: T.breadcrumbRoot }, { label: T.classGroup[p.portalClass] }, { label: p.country }]} />
      <header className="mt-4 max-w-[75ch]">
        <h1>
          {p.country}: {p.domain}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ClassBadge portalClass={p.portalClass} />
          <span className="text-[15px] text-ink">
            {p.portalType}
            {p.platform ? ` · ${p.platform}` : ""}
          </span>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-3">
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium">
            {T.officialSite}: {p.domain}
            <ExternalLink aria-hidden="true" size={14} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <SnapshotBadge snapshot={data.snapshot} />
        </p>
        {p.portalClass === "regional_context" ? <ContextBanner text={T.contextBanner} /> : null}
      </header>

      {/* 1 · Catalogue size */}
      <section aria-labelledby="catalogue-size" className="section">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="catalogue-size" className="scroll-mt-2">
            {T.size}
          </h2>
          <ComparabilityBadge status={national ? "partial" : "context_only"} reason={national ? T.sizeStatusNational : T.sizeStatusContext} />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <MetricCard metric={head} label={metricLabel(head.metric)} showUnit emphasis={false} showValidation />
          </div>
          <dl className="card grid content-start gap-3 p-5 text-[15px] leading-6 lg:col-span-7" data-size-definition>
            <div>
              <dt className="text-sm font-semibold text-ink-muted">{T.unitNote}</dt>
              <dd>{p.unitNote}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-ink-muted">{T.countDefinition}</dt>
              <dd>{head.countDefinition}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-ink-muted">Snapshot layer and time</dt>
              <dd>
                {layerTime(head)}
              </dd>
            </div>
            {head.comparabilityNote ? (
              <div>
                <dt className="text-sm font-semibold text-ink-muted">{T.comparabilityNote}</dt>
                <dd>{head.comparabilityNote}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* 2 · At a glance */}
      {view.glance.length ? (
        <section aria-labelledby="at-a-glance" className="section">
          <h2 id="at-a-glance" className="scroll-mt-2">
            {T.glance}
          </h2>
          <div className="mt-4">
            <PortalMetricGrid
              columns={3}
              items={view.glance.map((g) => {
                const m = resolveMetric(g.metricId);
                return { metric: m, label: metricLabel(m.metric), showUnit: true, derivedId: g.derivedId };
              })}
            />
          </div>
        </section>
      ) : null}

      {/* 3 · Publishers and organisations */}
      {view.publishersCell ? <TextSection id="publishers" title={T.publishers} cell={view.publishersCell} /> : null}

      {/* 4 · Themes (EU page: C4 reused with the EU series emphasised) */}
      {view.themesCell ? (
        <TextSection id="themes" title={T.themes} cell={view.themesCell}>
          {id === "eu" ? (
            <div className="mt-5">
              <p className="mb-3 text-sm text-ink-muted">{T.euThemesNote}</p>
              <Chart model={data.charts.C4} emphasiseEu />
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-ink-muted" data-theme-mapping-note>
            {THEME_MAPPING_NOTE}
          </p>
        </TextSection>
      ) : null}

      {/* 5 · Provenance (EU only) */}
      {id === "eu" && view.provenanceRows ? (
        <section aria-labelledby="provenance" className="section">
          <h2 id="provenance" className="scroll-mt-2">
            {T.provenance}
          </h2>
          <div className="mt-4 space-y-6">
            <Chart model={data.charts.C13} />
            <ProvenanceTable rows={view.provenanceRows} caption={T.provenanceTable} />
            <MethodologyNote href="/methodology#validation">{T.provenanceNote}</MethodologyNote>
          </div>
        </section>
      ) : null}

      {/* 6 · Access and reuse */}
      <section aria-labelledby="access" className="section">
        <h2 id="access" className="scroll-mt-2">
          {T.access}
        </h2>
        <div className="mt-4">
          <AccessMatrix portals={[p]} features={ACCESS_FEATURES} cells={data.access} featureLabels={FEATURE_LABEL} caption={`${T.access}: ${p.country}`} compact={false} />
        </div>
      </section>

      {/* 7 · Validation readings */}
      {view.readings.length ? (
        <section aria-labelledby="validation" className="section">
          <h2 id="validation" className="scroll-mt-2">
            {T.validation}
          </h2>
          <p className="mt-2 mb-4 max-w-[68ch] text-[15px] leading-6 text-ink-muted">
            {data.snapshot.validationLabel}. Canonical values keep the main position; later readings are validation evidence, and earlier readings are superseded.
          </p>
          <ValidationTable readings={view.readings} caption={`${T.validation}: ${p.country}`} />
        </section>
      ) : null}

      {/* 8 · Comparability notes */}
      <section aria-labelledby="comparability" className="section">
        <h2 id="comparability" className="scroll-mt-2">
          {T.comparability}
        </h2>
        <div className="card mt-4 p-5 text-[15px] leading-6">
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm font-semibold text-ink-muted">{T.countDefinition}</dt>
              <dd>{head.countDefinition}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-ink-muted">{T.includesNonOpen}</dt>
              <dd>{INCLUDES_NON_OPEN_TEXT[head.includesNonOpen] ?? head.includesNonOpen}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-ink-muted">{T.comparabilityNote}</dt>
              <dd>{head.comparabilityNote || p.unitNote}</dd>
            </div>
          </dl>
          <p className="mt-3">
            <ViewSource target={{ metricId: head.id }} className="text-sm" />
          </p>
        </div>
        <MethodologyNote href="/methodology#comparability">Count definitions differ between portals; see the data and comparability limitations.</MethodologyNote>
      </section>

      {/* 9 · Not collected for this portal */}
      {view.hidden.length ? (
        <section aria-labelledby="not-collected" className="section">
          <h2 id="not-collected" className="scroll-mt-2">
            {T.notCollected}
          </h2>
          <p className="mt-2 max-w-[68ch] text-[15px] leading-6 text-ink-muted">{T.notCollectedLead}</p>
          <ul className="mt-4 space-y-2" data-not-collected>
            {view.hidden.map((h) => (
              <li key={h} className="flex flex-wrap items-center gap-2 text-[15px]">
                <span className="font-medium">{HIDDEN_LABEL[h]}</span>
                <span className="missing-value">Not collected</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 10 · Sources */}
      <section aria-labelledby="sources" className="section">
        <h2 id="sources" className="scroll-mt-2">
          {T.sources}
        </h2>
        <div className="mt-4">
          <SourceList sources={sourcesFor(id)} />
        </div>
        <p className="mt-6">
          <Link href={compareHref} className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-[15px] font-semibold text-white no-underline hover:bg-accent-hover">
            {T.compareWithMk}
          </Link>
        </p>
        <p className="mt-3">
          <ViewSource target={{ metricId: head.id }} className="text-sm">
            View the catalogue-size record
          </ViewSource>
        </p>
      </section>

      <section aria-labelledby="other-portals" className="section">
        <h2 id="other-portals" className="scroll-mt-2">
          {T.otherPortals}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => (
            <PortalCard key={o.id} portal={o} headline={resolveMetric(o.headlineMetricId)} />
          ))}
        </div>
      </section>
    </div>
  );
}
