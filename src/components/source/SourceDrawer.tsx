"use client";
// Source drawer content. Native modal <dialog>: focus is trapped, Esc and Close both close
// it, focus moves to the heading on open and returns to the trigger on close (handled by the provider).
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import index from "@/data/generated/source-index.json";
import { NBSP, fmtLocal, fmtMetricValue, fmtReadingTime, fmtReadingValue, fmtSigned, fmtUtc, unitText } from "@/data/format";
import { formatDerived } from "@/data/tokens";
import type {
  AccessCapability,
  DerivedValue,
  Metric,
  SourceRecord,
  SourceTarget,
  ValidationReading,
} from "@/data/types";
import { CLASS_LABEL, LAYER_LABEL, LIVE_NOTE, RULES, SOURCE_TYPE_LABEL, STATUS_WORDING } from "@/content/copy";
import { DERIVED_LABEL, PROJECT_RULE_BY_METRIC, metricLabel } from "@/content/metricLabels";
import { ComparabilityBadge, MissingValue, ProjectIndicatorLabel, StateChip } from "@/components/ui/Badges";
import { LangText } from "@/components/ui/LangText";

interface PortalLite {
  country: string;
  displayName: string;
  portalClass: keyof typeof CLASS_LABEL;
  headlineMetricId: string;
  unitNote: string;
}
interface Index {
  metrics: Record<string, Metric>;
  readings: Record<string, ValidationReading>;
  sources: Record<string, SourceRecord>;
  derived: Record<string, DerivedValue>;
  cells: Record<string, AccessCapability>;
  portals: Record<string, PortalLite>;
  statements: Record<string, Statement>;
}
interface Statement {
  text: string | null;
  tokens: { token: string; rendered: string; inputs: string[] }[];
  metricIds: string[];
  tables: string[];
}
const IDX = index as unknown as Index;

const FEATURE_LABEL: Record<string, string> = {
  api: "API availability",
  formats: "Machine-readable formats",
  metadata_standard: "Metadata standard",
  licensing: "Licensing information",
  hvd: "HVD information",
  publishers: "Publisher information",
  metadata_activity: "Metadata activity",
  themes: "Themes",
};

/** Validation readings shown in field 8 for a metric (linked ones, plus unlinked readings of the same page). */
export function readingsForMetric(m: Metric): ValidationReading[] {
  const all = Object.values(IDX.readings).filter((r) => r.portalId === m.portalId);
  const linked = all.filter((r) => r.canonicalMetricId === m.id);
  const unlinked = all.filter((r) => r.canonicalMetricId === null);
  const t = (r: ValidationReading) => r.metric.toLowerCase();
  let extra: ValidationReading[] = [];
  if (m.metric === "organisations_listed" || m.metric === "organizations_total") extra = unlinked.filter((r) => t(r).includes("organ"));
  else if (m.metric === "resources_total") extra = unlinked.filter((r) => t(r).includes("files") || t(r).includes("resources"));
  else if (m.metric === "datasets_total")
    // readings of other quantities, and the homepage "catalogues" label whose meaning is not documented, stay out
    extra = unlinked.filter((r) => !/organ|files|resources|users|discussions/.test(t(r)) && !/meaning not documented/i.test(r.note));
  return [...linked, ...extra];
}

function methodologyAnchor(m: Metric): string {
  if (m.metric === "datasets_total" || m.metric === "records_metadata_modified_12m") return "#comparability";
  if (m.metric.includes("machine_readable") || m.metric.includes("open_format")) return "#derived-indicators";
  if (m.metric.includes("theme") || m.metric.includes("group")) return "#theme-mapping";
  if (m.metric.includes("format")) return "#format-normalisation";
  if (m.role === "validation") return "#validation";
  return "#source-register";
}

function Field({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    // One <div> per name–value group directly inside the <dl> (valid HTML; axe definition-list / dlitem).
    // The field number sits in the <dt>, hidden from assistive technology, in the left gutter.
    <div className="relative border-b border-rule py-3 pl-9 last:border-b-0">
      <dt className="text-xs font-semibold tracking-wide text-ink-muted">
        <span aria-hidden="true" className="absolute top-3 left-0 pt-0.5 font-mono text-[11px] font-normal tracking-normal">
          {n}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-6 break-words">{children}</dd>
    </div>
  );
}

/** Link rendering by URL status: recorded → link; internal project document; not recorded → words, no invented link. */
export function SourceLinkView({ source, href, label = "Open official source" }: { source: SourceRecord; href?: string | null; label?: string }) {
  if (source.urlStatus === "internal_project_document") {
    return (
      <span className="inline-flex items-center rounded border border-rule px-1.5 text-xs leading-5 text-ink-muted" data-url-status="internal_project_document">
        Internal project document
      </span>
    );
  }
  const url = href ?? source.url;
  if (source.urlStatus === "not_recorded" || !url) {
    return (
      <span className="missing-value" data-url-status="not_recorded">
        URL not recorded
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium" data-url-status="recorded">
      {label}
      <ExternalLink aria-hidden="true" size={14} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function SourceSummary({ s, href, linkLabel }: { s: SourceRecord; href?: string | null; linkLabel?: string }) {
  return (
    <span>
      {s.title} · {s.issuer}
      <br />
      <SourceLinkView source={s} href={href} label={linkLabel ?? (s.sourceType === "documentation" || s.sourceType === "report" ? "Open source" : "Open official source")} />
    </span>
  );
}

function diffText(r: ValidationReading): string {
  if (r.difference === null) return "";
  if (r.difference === 0) return "no difference";
  return `${fmtSigned(r.difference)}${r.differencePct !== null ? ` (${fmtSigned(r.differencePct, 3)}${NBSP}%)` : ""}`;
}

function ReadingLine({ r, onOpen }: { r: ValidationReading; onOpen: (t: SourceTarget) => void }) {
  const isNumber = r.visibleNumber !== null;
  return (
    <li className="py-1">
      <span className="font-medium">{fmtReadingValue(r.visibleValue, r.visibleNumber)}</span> {r.metric}
      {isNumber && r.difference !== null ? (
        <span>
          {" · "}
          {diffText(r)}
        </span>
      ) : null}
      {r.visibleValue.startsWith("HTTP 504") ? <span> · Timeout, not missing data</span> : null}
      <span className="block text-ink-muted">
        {r.layer === "V" ? "Later validation reading" : "Earlier reading (superseded)"} · {r.sourcePage}
      </span>
      {r.note ? <span className="block text-ink-muted">{r.note}</span> : null}
      <button type="button" className="text-xs text-accent underline" onClick={() => onOpen({ readingId: r.id })}>
        Reading record
      </button>
    </li>
  );
}

function MetricView({ m, onOpen }: { m: Metric; onOpen: (t: SourceTarget) => void }) {
  const s = IDX.sources[m.sourceId]!;
  const readings = readingsForMetric(m);
  const portal = IDX.portals[m.portalId]!;
  const isHeadline = m.metric === "datasets_total";
  const status = isHeadline ? (portal.portalClass === "national" ? "partial" : "context_only") : null;
  const pageReading = !m.rawSnapshot;
  return (
    <>
      <p className="text-sm text-ink-muted">{portal.displayName}</p>
      <dl className="mt-2">
        <Field n={1} label="Metric">
          {metricLabel(m.metric)} · <code className="font-mono text-xs">{m.id}</code>
        </Field>
        <Field n={2} label="Canonical value">
          {m.value === null ? (
            <MissingValue reason={m.missingReason ?? "not_reliably_available"} />
          ) : (
            <strong className="text-base">
              {fmtMetricValue(m.value, m.unit)}
              {unitText(m.unit, m.value) ? ` ${unitText(m.unit, m.value)}` : ""}
            </strong>
          )}
          {PROJECT_RULE_BY_METRIC[m.metric] ? (
            <span className="mt-2 block" data-drawer-project-indicator>
              <ProjectIndicatorLabel rule={PROJECT_RULE_BY_METRIC[m.metric]!} />
              <span className="mt-1 block text-sm text-ink-muted">
                <LangText text={RULES[PROJECT_RULE_BY_METRIC[m.metric]!]} />
              </span>
            </span>
          ) : null}
        </Field>
        <Field n={3} label="Source">
          <SourceSummary s={s} href={m.sourceUrl} />
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-ink-muted">Show request URL</summary>
            <code className="mt-1 block font-mono text-xs break-all select-all">{m.sourceUrl}</code>
          </details>
        </Field>
        <Field n={4} label="Source type and layer">
          {SOURCE_TYPE_LABEL[s.sourceType]} · {m.snapshotId} · {STATUS_WORDING[m.status]}
        </Field>
        <Field n={5} label="Retrieved">
          {fmtUtc(m.retrievedAtUtc.start)}
          {m.retrievedAtUtc.end ? ` to ${fmtUtc(m.retrievedAtUtc.end)}` : ""} · {fmtLocal(m.retrievedAtLocal)}
        </Field>
        <Field n={6} label="Extraction method">
          <code className="font-mono text-xs">{m.extractionMethod}</code>
          {pageReading ? (
            <span className="block">Read on the official page; no raw file exists, the reading time is recorded instead.</span>
          ) : (
            <span className="block">
              from <code className="font-mono text-xs break-all">{m.rawSnapshot}</code>
            </span>
          )}
        </Field>
        <Field n={7} label="Count definition">
          {m.countDefinition}
          {m.includesNonOpen === "yes" ? <span className="block text-ink-muted">Includes non-open records.</span> : null}
        </Field>
        <Field n={8} label="Later validation reading">
          {readings.length ? (
            <ul>
              {readings.map((r) => (
                <ReadingLine key={r.id} r={r} onOpen={onOpen} />
              ))}
            </ul>
          ) : (
            <span className="text-ink-muted">None registered for this value.</span>
          )}
        </Field>
        <Field n={9} label="Validation time">
          {readings.length ? (
            [...new Set(readings.map((r) => fmtReadingTime(r.readingTime)))].map((t) => (
              <span key={t} className="block">
                {t}
              </span>
            ))
          ) : (
            <span className="text-ink-muted">Not applicable: no later reading.</span>
          )}
        </Field>
        <Field n={10} label="Comparability">
          {status ? <ComparabilityBadge status={status} withTooltip={false} /> : null}{" "}
          {m.comparabilityNote || (isHeadline ? portal.unitNote : "No comparability note recorded.")}
        </Field>
        <Field n={11} label="Further reading">
          <a href={`/methodology${methodologyAnchor(m)}`}>Explained in methodology</a>
        </Field>
      </dl>
    </>
  );
}

function DerivedView({ d, onOpen }: { d: DerivedValue; onOpen: (t: SourceTarget) => void }) {
  return (
    <dl className="mt-2">
      <Field n={1} label="Derived value">
        {DERIVED_LABEL[d.id] ?? d.id} · <code className="font-mono text-xs">derived.{d.id}</code>
      </Field>
      <Field n={2} label="Value">
        <strong className="text-base">{formatDerived(d)}</strong>
        {d.projectDefined ? (
          <>
            {" "}
            <span className="ml-2 rounded-full border border-accent px-2 text-xs text-accent">Project-defined indicator</span>
          </>
        ) : null}
      </Field>
      <Field n={3} label="Formula">
        <LangText text={d.formula} />
      </Field>
      <Field n={4} label="Inputs">
        <ul>
          {d.inputs.map((i) => {
            const derivedId = i.startsWith("derived.") ? i.slice(8) : null;
            if (derivedId) return (
              <li key={i}><button type="button" className="text-accent underline" onClick={() => onOpen({ derivedId })}>{DERIVED_LABEL[derivedId] ?? derivedId}</button></li>
            );
            if (IDX.metrics[i]) return (
              <li key={i}><button type="button" className="text-accent underline" onClick={() => onOpen({ metricId: i })}>{metricLabel(IDX.metrics[i]!.metric)} ({i})</button></li>
            );
            return <li key={i}>Phase 1 table <a href={`/data/${i}`} download>{i}</a></li>;
          })}
        </ul>
      </Field>
      <Field n={5} label="Further reading">
        <a href="/methodology#derived-indicators">Explained in methodology</a>
      </Field>
    </dl>
  );
}

function CellView({ c, onOpen }: { c: AccessCapability; onOpen: (t: SourceTarget) => void }) {
  const portal = IDX.portals[c.portalId]!;
  return (
    <dl className="mt-2">
      <Field n={1} label="Portal and feature">
        {portal.displayName} · {FEATURE_LABEL[c.feature]}
      </Field>
      <Field n={2} label="State">
        <StateChip state={c.state} /> <span className="block">{c.display}</span>
      </Field>
      <Field n={3} label="Comparability">
        {c.comparability ? <ComparabilityBadge status={c.comparability} withTooltip={false} /> : <span className="text-ink-muted">No badge: the cell holds no comparable value.</span>}
        {c.comparabilityReason ? <span className="block">{c.comparabilityReason}</span> : null}
      </Field>
      <Field n={4} label="Layer">
        {c.layer ? LAYER_LABEL[c.layer] : <span className="text-ink-muted">No layer: nothing was collected.</span>}
      </Field>
      <Field n={5} label="Sources">
        {c.sourceIds.length ? (
          <ul>
            {c.sourceIds.map((id) => {
              const s = IDX.sources[id]!;
              return (
                <li key={id} className="py-1">
                  <button type="button" className="text-left text-accent underline" onClick={() => onOpen({ sourceId: id })}>{s.title}</button>{" "}
                  <SourceLinkView source={s} label={s.sourceType === "api_snapshot" ? "Open official source" : "Open source"} />
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="text-ink-muted">No source: the value was not collected in Phase 1.</span>
        )}
      </Field>
      {c.metricIds.length ? (
        <Field n={6} label="Values used">
          <ul>
            {c.metricIds.map((i) => {
              const derivedId = i.startsWith("derived.") ? i.slice(8) : null;
              return (
                <li key={i}>
                  <button type="button" className="text-accent underline" onClick={() => onOpen(derivedId ? { derivedId } : { metricId: i })}>
                    {derivedId ? (DERIVED_LABEL[derivedId] ?? derivedId) : metricLabel(IDX.metrics[i]?.metric ?? i)}
                  </button>
                </li>
              );
            })}
          </ul>
        </Field>
      ) : null}
      {c.note ? (
        <Field n={7} label="Note">
          {c.note}
        </Field>
      ) : null}
    </dl>
  );
}

function SourceView({ s }: { s: SourceRecord }) {
  return (
    <dl className="mt-2">
      <Field n={1} label="Source">
        {s.title} · <code className="font-mono text-xs">{s.id}</code>
      </Field>
      <Field n={2} label="Issuer">
        {s.issuer}
      </Field>
      <Field n={3} label="Link">
        <SourceLinkView source={s} label={s.sourceType === "api_snapshot" ? "Open official source" : "Open source"} />
        {s.urlStatus === "recorded" && s.url ? <code className="mt-1 block font-mono text-xs break-all">{s.url}</code> : null}
        {s.urlStatus === "internal_project_document" ? <span className="block text-ink-muted">The OpenDataScope Phase 1 research report is an internal project document and has no external URL.</span> : null}
      </Field>
      <Field n={4} label="Source type and layer">
        {SOURCE_TYPE_LABEL[s.sourceType]} · {LAYER_LABEL[s.layer]}
      </Field>
      <Field n={5} label="Retrieved">
        {s.retrievedAt ? fmtUtc(s.retrievedAt) : <span className="text-ink-muted">No retrieval time: structural evidence.</span>}
      </Field>
      <Field n={6} label="Raw evidence">
        {s.rawFile ? <code className="font-mono text-xs break-all">{s.rawFile}</code> : <span className="text-ink-muted">No raw file.</span>}
      </Field>
      <Field n={7} label="Used for">
        {s.usedFor}
      </Field>
    </dl>
  );
}

function ReadingView({ r, onOpen }: { r: ValidationReading; onOpen: (t: SourceTarget) => void }) {
  const s = r.sourceId ? IDX.sources[r.sourceId] : null;
  return (
    <dl className="mt-2">
      <Field n={1} label="Reading">
        {IDX.portals[r.portalId]!.displayName} · {r.metric}
      </Field>
      <Field n={2} label="Visible value">
        <strong>{fmtReadingValue(r.visibleValue, r.visibleNumber)}</strong> · {r.layer === "V" ? "Later validation reading" : "Earlier reading (superseded)"}
        {r.visibleValue.startsWith("HTTP 504") ? <span className="block">Timeout, not missing data; S1 organisation figures kept.</span> : null}
      </Field>
      <Field n={3} label="Page">
        {r.sourcePage}
        {s ? <span className="block"><SourceLinkView source={s} label="Open source" /></span> : null}
      </Field>
      <Field n={4} label="Reading time">
        {fmtReadingTime(r.readingTime)}
      </Field>
      <Field n={5} label="Canonical value">
        {r.canonicalMetricId ? (
          <button type="button" className="text-accent underline" onClick={() => onOpen({ metricId: r.canonicalMetricId! })}>
            {fmtMetricValue(r.canonicalValue, "count")} ({r.canonicalMetricId})
          </button>
        ) : (
          <span className="text-ink-muted">No canonical counterpart: the reading is context only.</span>
        )}
      </Field>
      <Field n={6} label="Difference">
        {r.difference === null ? <span className="text-ink-muted">Not applicable: the reading has no numeric counterpart.</span> : r.difference === 0 ? "No difference" : diffText(r)}
      </Field>
      {r.note ? (
        <Field n={7} label="Note">
          {r.note}
        </Field>
      ) : null}
    </dl>
  );
}

/** One input of a rendered value: a metric, a derived value or a cell of a frozen table (with a CSV link). */
function InputLink({ input, onOpen }: { input: string; onOpen: (t: SourceTarget) => void }) {
  if (input.startsWith("derived.")) {
    const id = input.slice(8);
    return (
      <button type="button" className="text-left text-accent underline" onClick={() => onOpen({ derivedId: id })}>
        {DERIVED_LABEL[id] ?? id} <span className="font-mono text-xs">({input})</span>
      </button>
    );
  }
  if (input.startsWith("table:")) {
    const parts = input.slice(6).split("|");
    if (parts[0] === "rowcount") {
      return (
        <span>
          Row count of <a href={`/data/${parts[1]}.csv`} download>{parts[1]}.csv</a>
        </span>
      );
    }
    return (
      <span>
        <a href={`/data/${parts[0]}.csv`} download>
          {parts[0]}.csv
        </a>
        , row <code className="font-mono text-xs">{parts[1]}</code>, column <code className="font-mono text-xs">{parts[2]}</code>
      </span>
    );
  }
  const m = IDX.metrics[input];
  return (
    <button type="button" className="text-left text-accent underline" onClick={() => onOpen({ metricId: input })}>
      {m ? `${IDX.portals[m.portalId]?.country ?? m.portalId}: ${metricLabel(m.metric)}` : input} <span className="font-mono text-xs">({input})</span>
    </button>
  );
}

/** Project rules behind a statement's values: derived inputs marked project-defined, or rule-based metrics. */
function statementRules(st: Statement): ("machine_readable" | "open_format" | "local_government")[] {
  const rules = new Set<"machine_readable" | "open_format" | "local_government">();
  for (const input of [...st.tokens.flatMap((t) => t.inputs), ...st.metricIds]) {
    if (input.startsWith("derived.")) {
      const d = IDX.derived[input.slice(8)];
      if (!d?.projectDefined) continue;
      const f = d.formula + " " + d.inputs.join(" ");
      rules.add(/open_format/.test(f) ? "open_format" : /machine_readable/.test(f) ? "machine_readable" : "local_government");
    } else {
      const rule = PROJECT_RULE_BY_METRIC[IDX.metrics[input]?.metric ?? ""];
      if (rule) rules.add(rule);
    }
  }
  return [...rules];
}

function StatementView({ st, onOpen }: { st: Statement; onOpen: (t: SourceTarget) => void }) {
  // Fields are numbered in the order shown (K2), whichever optional fields are present.
  let n = 0;
  const next = () => ++n;
  const rules = statementRules(st);
  return (
    <dl className="mt-2">
      {st.text ? (
        <Field n={next()} label="Statement">
          {st.text}
        </Field>
      ) : null}
      <Field n={next()} label="Values in this statement">
        {st.tokens.length ? (
          <ul className="space-y-2">
            {st.tokens.map((t, i) => (
              <li key={i} data-statement-value={t.rendered}>
                <strong>{t.rendered}</strong>
                <span className="block text-ink-muted">from</span>
                <ul className="ml-3 list-disc">
                  {t.inputs.map((inp) => (
                    <li key={inp}>
                      <InputLink input={inp} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-ink-muted">No generated value in this text.</span>
        )}
      </Field>
      {rules.length ? (
        <Field n={next()} label="Project rule">
          {rules.map((r) => (
            <span key={r} className="mb-1 block">
              <ProjectIndicatorLabel rule={r} />
              <span className="mt-1 block text-sm text-ink-muted">
                <LangText text={RULES[r]} />
              </span>
            </span>
          ))}
        </Field>
      ) : null}
      {st.metricIds.length ? (
        <Field n={next()} label="Input values">
          <ul>
            {st.metricIds.map((id) => (
              <li key={id}>
                <InputLink input={id} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </Field>
      ) : null}
      {st.tables.length ? (
        <Field n={next()} label="Tables">
          <ul>
            {st.tables.map((f) => (
              <li key={f}>
                <a href={`/data/${f}`} download>
                  {f}
                </a>
              </li>
            ))}
          </ul>
        </Field>
      ) : null}
      <Field n={next()} label="Further reading">
        <a href="/methodology#derived-indicators">Explained in methodology</a>
      </Field>
    </dl>
  );
}

function titleFor(t: SourceTarget): string {
  if ("statement" in t) return t.statement.startsWith("chart.") ? "Values in this chart" : "Values in this statement";
  if ("metricId" in t) return metricLabel(IDX.metrics[t.metricId]?.metric ?? t.metricId);
  if ("derivedId" in t) return DERIVED_LABEL[t.derivedId] ?? t.derivedId;
  if ("sourceId" in t) return IDX.sources[t.sourceId]?.title ?? t.sourceId;
  if ("readingId" in t) return "Validation reading";
  return `${IDX.portals[t.cell.portalId]?.country ?? t.cell.portalId}: ${FEATURE_LABEL[t.cell.feature]}`;
}

function Body({ t, onOpen }: { t: SourceTarget; onOpen: (t: SourceTarget) => void }) {
  if ("metricId" in t) {
    const m = IDX.metrics[t.metricId];
    return m ? <MetricView m={m} onOpen={onOpen} /> : <p>Unknown record.</p>;
  }
  if ("derivedId" in t) {
    const d = IDX.derived[t.derivedId];
    return d ? <DerivedView d={d} onOpen={onOpen} /> : <p>Unknown record.</p>;
  }
  if ("sourceId" in t) {
    const s = IDX.sources[t.sourceId];
    return s ? <SourceView s={s} /> : <p>Unknown record.</p>;
  }
  if ("readingId" in t) {
    const r = IDX.readings[t.readingId];
    return r ? <ReadingView r={r} onOpen={onOpen} /> : <p>Unknown record.</p>;
  }
  if ("statement" in t) {
    const st = IDX.statements[t.statement];
    return st ? <StatementView st={st} onOpen={onOpen} /> : <p>Unknown record.</p>;
  }
  const c = IDX.cells[`${t.cell.portalId}.${t.cell.feature}`];
  return c ? <CellView c={c} onOpen={onOpen} /> : <p>Unknown record.</p>;
}

export function SourceDrawer({
  target,
  canGoBack,
  onBack,
  onClose,
  onOpen,
}: {
  target: SourceTarget | null;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpen: (t: SourceTarget) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
    if (target) heading.current?.focus();
  }, [target]);

  // A click on the backdrop (the dialog element itself, outside its content) closes the drawer.
  // The keyboard equivalent is Esc, handled natively through the dialog's cancel event.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === d) onClose();
    };
    d.addEventListener("click", onBackdrop);
    return () => d.removeEventListener("click", onBackdrop);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      className="drawer fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-xl border border-rule bg-surface p-0 text-ink lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:max-h-none lg:w-[440px] lg:rounded-none lg:rounded-l-xl"
      aria-labelledby="source-drawer-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {target ? (
        <div className="px-5 pt-4 pb-6">
          <div className="flex items-center justify-between gap-2">
            {canGoBack ? (
              <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-accent">
                <ArrowLeft aria-hidden="true" size={16} /> Back
              </button>
            ) : (
              <span className="text-xs font-semibold tracking-wide text-ink-muted">EVIDENCE RECORD</span>
            )}
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-ink-muted hover:text-ink">
              <X aria-hidden="true" size={18} /> Close
            </button>
          </div>
          <h2 id="source-drawer-title" ref={heading} tabIndex={-1} className="mt-3 font-serif text-xl leading-7">
            {titleFor(target)}
          </h2>
          <Body t={target} onOpen={onOpen} />
          <p className="mt-4 rounded-md bg-bg p-3 text-xs leading-5 text-ink-muted">{LIVE_NOTE}</p>
        </div>
      ) : null}
    </dialog>
  );
}
