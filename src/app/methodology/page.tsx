// /methodology: 12 anchored sections; tables span the full width; every statistic is a token.
import type { Metadata } from "next";
import Link from "next/link";
import { data, nationalPortals } from "@/data";
import {
  countDefinitionRows,
  countryView,
  derivedRows,
  driftRows,
  formatMapRows,
  layerRows,
  sourceRegisterRows,
  sourceTypeRows,
  themeRows,
  validationRegisterRows,
} from "@/data/views";
import { LangText } from "@/components/ui/LangText";
import { CORE_RULE, DATA_LIMITS_SUMMARY, HERO, NO_ZERO_NO_ESTIMATE, RULES } from "@/content/copy";
import { CHECKS, LIMITATIONS, METHODOLOGY_COPY as T, METHODOLOGY_SECTIONS, PROCESS_FACTS, PROCESS_STEPS } from "@/content/methodology";
import { PAGES } from "@/content/pages";
import { SectionNav } from "@/components/ui/SectionNav";
import { DataTable } from "@/components/ui/DataTable";
import { MethodologyNote } from "@/components/ui/Notes";
import { ProjectIndicatorLabel } from "@/components/ui/Badges";
import { SnapshotBadge } from "@/components/shell/SnapshotBadge";
import { ViewSource } from "@/components/source/SourceBadge";
import { DownloadPanel, ProcessSteps } from "@/components/sections/MethodologyParts";
import { CountTable, DerivedTable, ReadingTable, SourceRegisterTable } from "@/components/sections/MethodologyTables";
import { ProvenanceTable } from "@/components/sections/CountryTables";

export const metadata: Metadata = { title: PAGES.methodology.title, description: PAGES.methodology.description };

const S = Object.fromEntries(METHODOLOGY_SECTIONS.map((s) => [s.id, s])) as Record<(typeof METHODOLOGY_SECTIONS)[number]["id"], (typeof METHODOLOGY_SECTIONS)[number]>;
const P = "max-w-[68ch] text-[16px] leading-7";

/** Methodology sentence; "View evidence" only where the sentence carries generated values. */
const WITH_VALUES = new Set(data.tokenLog.filter((t) => t.where.startsWith("methodology.")).map((t) => t.where));
function M({ k, as: Tag = "p", className = P }: { k: string; as?: "p" | "span" | "li"; className?: string }) {
  const where = `methodology.${k}`;
  const has = WITH_VALUES.has(where);
  return (
    <Tag className={className} data-statement={has ? where : undefined}>
      {data.content.methodology[k]}
      {has ? (
        <>
          {" "}
          <ViewSource target={{ statement: where }} className="text-xs whitespace-nowrap">
            View evidence
          </ViewSource>
        </>
      ) : null}
    </Tag>
  );
}

function H({ id }: { id: keyof typeof S }) {
  return (
    <h2 id={id} className="mb-4 scroll-mt-2">
      {S[id].heading}
    </h2>
  );
}

export default function MethodologyPage() {
  const nm = data.content.methodology;
  const nationals = nationalPortals().map((p) => p.country);
  return (
    <div className="frame pt-10 pb-8 lg:pt-14">
      <header className="max-w-[68ch]">
        <h1>{T.h1}</h1>
        <p className="mt-3 text-lg leading-8">{T.lead}</p>
        <div className="mt-3">
          <SnapshotBadge snapshot={data.snapshot} />
        </div>
      </header>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-12">
        <SectionNav items={METHODOLOGY_SECTIONS.map((s) => ({ id: s.id, label: s.nav }))} />
        <div className="min-w-0 space-y-16 lg:space-y-20">
          {/* 1 */}
          <section aria-labelledby="research-question">
            <H id="research-question" />
            <p className={`${P} font-medium`}>{HERO.question.replace(/^Research question: /, "")}</p>
            <p className={`${P} mt-3`}>{nm.scope}</p>
            <p className="mt-2 text-sm text-ink-muted">National portals: {nationals.join(", ")}.</p>
            <p className={`${P} mt-3 font-semibold`}>{nm.noRanking}</p>
          </section>

          {/* 2 */}
          <section aria-labelledby="process">
            <H id="process" />
            <ProcessSteps
              steps={PROCESS_STEPS.map((s) => ({
                n: s.n,
                title: s.title,
                detail: nm[s.key] ?? "",
                evidence: WITH_VALUES.has(`methodology.${s.key}`) ? (
                  <ViewSource target={{ statement: `methodology.${s.key}` }} className="text-xs whitespace-nowrap">
                    View evidence
                  </ViewSource>
                ) : undefined,
              }))}
            />
          </section>

          {/* 3 */}
          <section aria-labelledby="data-sources">
            <H id="data-sources" />
            <M k="hierarchy" />
            <M k="verification" className={`${P} mt-3`} />
            <M k="serbia" className={`${P} mt-3`} />
            <div className="mt-6 max-w-md">
              <DataTable caption={T.sourceCounts} columns={[{ key: "type", header: "Source type" }, { key: "sources", header: "Sources", align: "right" }]} rows={sourceTypeRows()} />
              <p className="mt-2 text-xs text-ink-muted">
                Counted from sources.csv ·{" "}
                <a href="/data/sources.csv" download>
                  Download
                </a>
              </p>
            </div>
          </section>

          {/* 4 */}
          <section aria-labelledby="collection">
            <H id="collection" />
            <DataTable
              caption={T.layerTable}
              columns={[
                { key: "layer", header: "Layer" },
                { key: "what", header: "What it is" },
                { key: "role", header: "Role" },
                { key: "utc", header: "Time (UTC)" },
                { key: "local", header: "Time (Europe/Skopje)" },
              ]}
              rows={layerRows()}
            />
            <p className="mt-2 text-xs text-ink-muted" data-process-facts>
              Collector versions, call counts and the screenshot count come from the Phase 1 report&apos;s layer table (
              {PROCESS_FACTS.map((f) => `${f.what}`).join("; ")}) ·{" "}
              <ViewSource target={{ sourceId: "P1-report" }} className="text-xs">
                Source record
              </ViewSource>
              . Canonical times are computed from metrics.csv.
            </p>
            <M k="mixing" className={`${P} mt-4`} />
          </section>

          {/* 5 */}
          <section aria-labelledby="snapshot">
            <H id="snapshot" />
            <blockquote className="max-w-[68ch] border-l-4 border-accent bg-surface px-5 py-4 text-[16px] leading-7 font-medium">{CORE_RULE}</blockquote>
            <M k="canonicalVsValidation" className={`${P} mt-4`} />
            <p className={`${P} mt-3 text-ink-muted`}>
              {data.snapshot.label} ({data.snapshot.localLabel}). {data.snapshot.validationLabel}.
            </p>
            <div className="mt-6">
              <ReadingTable
                caption={T.driftTable}
                rows={driftRows()}
                columns={[
                  { key: "portal", header: "Portal", primary: true },
                  { key: "readingName", header: "Reading" },
                  { key: "canonical", header: "Canonical (snapshot)", align: "right" },
                  { key: "reading", header: "Later reading", align: "right" },
                  { key: "difference", header: "Difference", align: "right" },
                  { key: "drift", header: "Drift", align: "right" },
                ]}
              />
            </div>
          </section>

          {/* 6 */}
          <section aria-labelledby="cleaning">
            <H id="cleaning" />
            <ul className="max-w-[68ch] list-disc space-y-2 pl-5">
              {["cleanUtc", "cleanTitles", "cleanPairs", "cleanNull", "cleanLicence"].map((k) => (
                <M key={k} k={k} as="li" className="text-[16px] leading-7" />
              ))}
            </ul>
          </section>

          {/* 7 */}
          <section aria-labelledby="format-normalisation">
            <H id="format-normalisation" />
            <M k="formatsLead" />
            <div className="mt-4 grid max-w-[68ch] gap-3">
              <p className="flex flex-wrap items-center gap-2 text-[15px] leading-6">
                <ProjectIndicatorLabel rule="machine_readable" /> {RULES.machine_readable}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-[15px] leading-6">
                <ProjectIndicatorLabel rule="open_format" /> {RULES.open_format}
              </p>
            </div>
            <div className="mt-6">
              <DataTable
                caption={T.mapTable}
                columns={[
                  { key: "format", header: "Normalised format", primary: true },
                  { key: "class", header: "Class (project rule)" },
                  { key: "raw", header: "Raw labels (resources)" },
                  { key: "resources", header: "Resources", align: "right" },
                ]}
                rows={formatMapRows()}
              />
              <p className="mt-2 text-xs text-ink-muted">
                From mk_format_shares.csv and mk_format_labels_raw.csv · <ViewSource target={{ statement: "chart.C5" }} className="text-xs">Values in this table</ViewSource>
              </p>
            </div>
          </section>

          {/* 8 */}
          <section aria-labelledby="theme-mapping">
            <H id="theme-mapping" />
            <M k="themesLead" />
            <div className="mt-6">
              <DataTable
                caption={T.themeTable}
                columns={[
                  { key: "code", header: "Code" },
                  { key: "name", header: "EU theme (English)", primary: true },
                  { key: "short", header: "Short label" },
                  { key: "datasets", header: "MK datasets", align: "right" },
                ]}
                rows={themeRows()}
              />
              <p className="mt-2 text-xs text-ink-muted">
                From mk_themes.csv and theme_labels.csv · <ViewSource target={{ statement: "chart.C3" }} className="text-xs">Values in this table</ViewSource>
              </p>
            </div>
          </section>

          {/* 9 */}
          <section aria-labelledby="derived-indicators">
            <H id="derived-indicators" />
            <M k="derivedLead" />
            <p className="mt-2 max-w-[68ch] text-[15px] leading-6">
              <LangText text={RULES.local_government} />
            </p>
            <div className="mt-6">
              <DerivedTable rows={derivedRows()} caption={T.derivedTable} />
            </div>
          </section>

          {/* 10 */}
          <section aria-labelledby="comparability">
            <H id="comparability" />
            <div className="max-w-[68ch] space-y-2 border-l-4 border-accent bg-surface px-5 py-4" data-limits-summary>
              <p className="text-[16px] leading-7">{DATA_LIMITS_SUMMARY}</p>
              <p className="text-[16px] leading-7 font-semibold">{NO_ZERO_NO_ESTIMATE}</p>
            </div>
            <div className="mt-6">
              <CountTable rows={countDefinitionRows()} caption={T.countTable} />
            </div>
            <h3 className="mt-8">Limitations</h3>
            <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5">
              {LIMITATIONS.map((l, i) =>
                l.key ? (
                  <M key={i} k={l.key} as="li" className="text-[16px] leading-7" />
                ) : (
                  <li key={i} className="text-[16px] leading-7">
                    {l.text}
                  </li>
                ),
              )}
            </ul>
            <MethodologyNote>
              Compare only where units and queries match: <Link href="/compare">open the comparison</Link>, where every row carries its badge.
            </MethodologyNote>
          </section>

          {/* 11 */}
          <section aria-labelledby="validation">
            <H id="validation" />
            <p className={P}>Every later and earlier reading is kept as validation evidence. The canonical value never changes because of a later reading. For the later (V) readings the exact capture time was not recorded; they were taken after S2 and before the time shown.</p>
            <div className="mt-6">
              <ReadingTable
                scroll
                caption={T.validationTable}
                rows={validationRegisterRows()}
                columns={[
                  { key: "reading", header: "Reading", primary: true },
                  { key: "value", header: "Visible value", align: "right" },
                  { key: "kind", header: "Kind" },
                  { key: "time", header: "Reading time" },
                  { key: "difference", header: "Difference from canonical", align: "right" },
                  { key: "note", header: "Note" },
                ]}
              />
            </div>
            <h3 className="mt-10">{T.checksTable}</h3>
            <ol className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-surface" data-checks>
              {CHECKS.map((c, i) => (
                <li key={c.key} className="grid gap-1 px-4 py-3 md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
                  <span aria-hidden="true" className="text-sm font-semibold text-ink-muted">
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-6">{c.check}</span>
                  <M k={c.key} as="span" className="text-[15px] leading-6 font-medium" />
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <ProvenanceTable rows={countryView("eu").provenanceRows ?? []} caption={T.harvestedTable} />
            </div>
          </section>

          {/* 12 */}
          <section aria-labelledby="source-register">
            <H id="source-register" />
            <p className={P}>Every source behind the snapshot, with its layer, retrieval time and link status. A source without a recorded URL says so; no link is made up.</p>
            <div className="mt-6">
              <SourceRegisterTable rows={sourceRegisterRows()} sources={data.sources} caption={T.sourcesTable} />
            </div>
            <h3 id="downloads" className="mt-10 scroll-mt-2">
              {T.downloads}
            </h3>
            <p className="mt-2 mb-4 max-w-[68ch] text-[15px] leading-6">{T.downloadsLead.replace("{n}", String(data.downloads.length))}</p>
            <DownloadPanel files={data.downloads} manifestLabel={T.manifest} />
          </section>
        </div>
      </div>
    </div>
  );
}
