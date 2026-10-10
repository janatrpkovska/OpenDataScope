// Overview building blocks: Hero, EuAggregatorPanel, FindingsPanel, ConclusionPanel.
// Server components: all copy with numbers comes from the build-time bundle.
import Link from "next/link";
import type { Cta, RenderedFinding, RenderedStatement, SnapshotInfo } from "@/data/types";
import { ComparabilityBadge, ClassBadge } from "@/components/ui/Badges";
import { SnapshotBadge } from "@/components/shell/SnapshotBadge";
import { ViewSource } from "@/components/source/SourceBadge";

export function Hero({
  title,
  subtitle,
  description,
  question,
  summary,
  ctas,
  snapshot,
  inShortLabel,
}: {
  title: string;
  subtitle: string;
  description: string;
  question: string;
  summary: string;
  ctas: Cta[];
  snapshot: SnapshotInfo;
  inShortLabel: string;
}) {
  return (
    <div id="top" className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        <h1>{title}</h1>
        <p className="mt-1 font-serif text-xl leading-7 text-ink-muted lg:text-2xl lg:leading-8">{subtitle}</p>
        <p className="mt-5 text-[17px] leading-7">{description}</p>
        <p className="mt-3 text-[17px] leading-7 font-medium">{question}</p>
        <div className="mt-4">
          <SnapshotBadge snapshot={snapshot} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {ctas.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-[15px] font-semibold no-underline ${
                c.variant === "primary" ? "bg-accent text-white hover:bg-accent-hover" : "border border-accent bg-surface text-accent hover:bg-accent-soft"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
      <section className="lg:col-span-5" aria-labelledby="in-short">
        <div className="card border-l-4 !border-l-accent p-5 lg:p-6">
          <h2 id="in-short" className="font-sans text-lg leading-7 font-semibold">
            {inShortLabel}
          </h2>
          <p className="mt-2 text-[16px] leading-7" data-statement="text.summary">
            {summary}
          </p>
          <p className="mt-3">
            <ViewSource target={{ statement: "text.summary" }} className="text-sm">
              View evidence
            </ViewSource>
          </p>
        </div>
      </section>
    </div>
  );
}

export function EuAggregatorPanel({
  total,
  unit,
  statement,
  facts,
  euHref,
  euLinkLabel,
}: {
  total: string;
  unit: string;
  statement: string;
  facts: { key: string; text: string; statement: string }[];
  euHref: string;
  euLinkLabel: string;
}) {
  return (
    <div className="eu-panel rounded-lg border-2 border-dashed border-eu bg-eu-tint p-5 lg:p-7" data-eu-panel>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ClassBadge portalClass="aggregator" />
        <ComparabilityBadge status="context_only" reason="An aggregator re-counts national catalogues; it is never ranked against national portals." />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="metric-number text-eu" data-value="eu.datasets_total">
            {total}
          </p>
          <p className="text-sm leading-5 text-ink">{unit} on data.europa.eu</p>
          <p className="mt-1">
            <ViewSource target={{ metricId: "eu.datasets_total" }} className="text-sm" />
          </p>
          <p className="mt-4 text-[15px] leading-6 text-ink">{statement}</p>
        </div>
        <ul className="space-y-3 lg:col-span-7">
          {facts.map((f) => (
            <li key={f.key} className="rounded-md border border-eu/30 bg-surface px-4 py-3 text-[15px] leading-6" data-statement={f.statement}>
              {f.text}{" "}
              <ViewSource target={{ statement: f.statement }} className="text-xs whitespace-nowrap">
                View evidence
              </ViewSource>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5">
        <Link href={euHref} className="font-medium">
          {euLinkLabel}
        </Link>
      </p>
    </div>
  );
}

export function FindingsPanel({ findings, readMore }: { findings: RenderedFinding[]; readMore: string }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {findings.map((f) => (
        <li key={f.id} className="card flex flex-col p-5" data-finding={f.id}>
          <div className="flex items-center justify-between gap-2">
            <span aria-hidden="true" className="font-serif text-2xl leading-8 font-semibold text-accent">
              {f.n}
            </span>
            {f.status ? <ComparabilityBadge status={f.status} size="sm" /> : null}
          </div>
          <p className="mt-2 text-[15px] leading-6" data-statement={`findings.${f.id}`}>
            <span className="sr-only">Finding {f.n}: </span>
            {f.text}
          </p>
          <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm">
            <ViewSource target={{ statement: `findings.${f.id}` }} className="text-sm">
              View evidence
            </ViewSource>
            <Link href={f.href}>{readMore}</Link>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ConclusionPanel({ items, statements, readMore }: { items: RenderedStatement[]; statements: string[]; readMore: string }) {
  return (
    <ol className="card divide-y divide-rule">
      {items.map((s) => {
        const key = `conclusion.${s.id}`;
        return (
          <li key={s.id} className="grid gap-x-4 px-5 py-4 sm:grid-cols-[2rem_1fr] lg:px-6" data-conclusion={s.id}>
            <span aria-hidden="true" className="font-serif text-xl leading-7 font-semibold text-accent">
              {s.n}
            </span>
            <div>
              <p className="text-[16px] leading-7" data-statement={statements.includes(key) ? key : undefined}>
                {s.text}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {s.status ? <ComparabilityBadge status={s.status} size="sm" /> : null}
                {statements.includes(key) ? (
                  <ViewSource target={{ statement: key }} className="text-sm">
                    View evidence
                  </ViewSource>
                ) : null}
                <Link href={s.href}>{readMore}</Link>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
