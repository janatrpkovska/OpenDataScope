"use client";
// /compare client view: selection in the URL (router.replace), selector chips as
// checkboxes in a fieldset, EU and Serbia as labelled switches, notices for invalid parameters, a polite live
// region announcing the comparison, the 10-row table (desktop) or one card per row (mobile), and C1 filtered.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ChartBundle, CompareCell, CompareRow, CompareSelection, Portal, PortalId } from "@/data/types";
import { DEFAULT_SELECTION, parseSelection, rowBadge, selectionToQuery, sortNational, type CompareNotice } from "@/data/compare";
import { COMPARE_COPY as T } from "@/content/compare";
import { ClassBadge, ComparabilityBadge, MissingValue } from "@/components/ui/Badges";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { StickyScrollRegion } from "@/components/ui/StickyScrollRegion";
import { EmptyState } from "@/components/ui/Notes";
import { SourceBadge } from "@/components/source/SourceBadge";
import { Chart } from "@/components/charts/Chart";

type PortalLite = Pick<Portal, "id" | "country" | "domain" | "portalClass">;

const NOTICE_TEXT: Record<CompareNotice, string> = { reset: T.resetNotice, max: T.maxNotice, toggle: T.toggleNotice };

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function CellView({ c }: { c: CompareCell | undefined }) {
  if (!c) return null;
  const missing = c.state !== "available" && c.state !== "limited";
  return (
    <div className="flex flex-col gap-1" data-compare-cell={c.portalId}>
      {missing ? <MissingValue reason={c.state as "not_collected"} withTooltip /> : <span className="text-[14px] leading-5 font-medium text-ink">{c.display}</span>}
      {missing && c.display && c.display.toLowerCase() !== "not collected" ? <span className="text-[13px] leading-[18px] text-ink-muted">{c.display}</span> : null}
      {c.secondary ? <span className="text-[13px] leading-[18px] text-ink-muted">{c.secondary}</span> : null}
      <span className="mt-0.5 flex flex-wrap items-center gap-1">
        {c.status ? <ComparabilityBadge status={c.status} size="sm" /> : null}
        <SourceBadge layer={c.layer} target={c.target} label={`View source for this cell${c.layer ? ` (layer ${c.layer})` : ""}`} />
      </span>
    </div>
  );
}

function RowHead({ row, national }: { row: CompareRow; national: PortalId[] }) {
  const badge = rowBadge(row, national);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm font-semibold text-ink">{row.label}</span>
      <span className="flex flex-wrap items-center gap-1">
        {badge ? (
          <ComparabilityBadge status={badge} size="sm" reason={row.why} />
        ) : (
          <span className="rounded-full border border-dashed border-ink-muted px-2 text-[11px] leading-5 text-ink-muted" data-row-not-comparable>
            {T.notComparable}
          </span>
        )}
        <InfoTooltip label={`${T.why} ${row.label}`} trigger={
            <span className="text-xs font-medium text-accent underline underline-offset-2">
              {T.why}
              <span className="sr-only"> {row.label}</span>
            </span>
          }>
          {row.why}
        </InfoTooltip>
      </span>
    </div>
  );
}

export function CompareView({ portals, rows, c1 }: { portals: PortalLite[]; rows: CompareRow[]; c1: ChartBundle["C1"] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const parsed = useMemo(() => parseSelection(params), [params]);
  const [sel, setSel] = useState<CompareSelection>(parsed.selection);
  const [notices, setNotices] = useState<CompareNotice[]>(parsed.notices);
  const [announce, setAnnounce] = useState("");

  // Normalise the URL once (drops unknown or duplicate ids, applies the default after a reset).
  useEffect(() => {
    const qs = selectionToQuery(parsed.selection);
    if (params.toString() !== qs) router.replace(`${pathname}?${qs}`, { scroll: false });
    // only on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = (id: PortalId) => portals.find((p) => p.id === id)!;
  const nationals = portals.filter((p) => p.portalClass === "national");

  const update = (next: CompareSelection) => {
    const s = { ...next, national: sortNational(next.national) };
    setSel(s);
    setNotices([]);
    if (s.national.length >= 2) router.replace(`${pathname}?${selectionToQuery(s)}`, { scroll: false });
    else router.replace(`${pathname}?portals=${s.national.join(",")}&eu=${s.includeEu ? 1 : 0}&rs=${s.includeRs ? 1 : 0}`, { scroll: false });
    const names = s.national.map((id) => byId(id).country);
    const extra = [s.includeEu ? "the EU aggregator" : null, s.includeRs ? "Serbia as regional context" : null].filter(Boolean) as string[];
    setAnnounce(s.national.length >= 2 ? `Comparing ${listNames(names)}${extra.length ? `, with ${listNames(extra)}` : ""}` : T.emptyTitle);
  };

  const toggle = (id: PortalId) => {
    const has = sel.national.includes(id);
    if (!has && sel.national.length >= 4) return;
    update({ ...sel, national: has ? sel.national.filter((x) => x !== id) : [...sel.national, id] });
  };

  const columns: PortalLite[] = [...sel.national.map(byId), ...(sel.includeEu ? [byId("eu")] : []), ...(sel.includeRs ? [byId("rs")] : [])];
  const enough = sel.national.length >= 2;

  return (
    <>
      {notices.length ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-partial bg-surface px-4 py-3 text-sm" role="status" data-compare-notice>
          <p>{notices.map((n) => NOTICE_TEXT[n]).join(" ")}</p>
          <button type="button" onClick={() => setNotices([])} className="inline-flex items-center gap-1 text-ink-muted hover:text-ink">
            <X aria-hidden="true" size={16} /> {T.dismiss}
          </button>
        </div>
      ) : null}

      {/* Selector */}
      <div className="card p-4 lg:p-5" data-compare-selector>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">{T.legend}</legend>
            <div className="flex flex-wrap gap-2">
              {nationals.map((p) => {
                const checked = sel.national.includes(p.id);
                const disabled = !checked && sel.national.length >= 4;
                return (
                  <label
                    key={p.id}
                    className={`chip-check inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      checked ? "border-accent bg-accent-soft font-semibold text-accent" : "border-rule bg-surface text-ink"
                    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input type="checkbox" className="accent-[var(--accent)]" checked={checked} disabled={disabled} onChange={() => toggle(p.id)} />
                    {p.country}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 hidden text-xs font-medium text-ink-muted md:block" data-compare-counter>
              {sel.national.length} of 4 selected
            </p>
          </fieldset>
          <div className="flex flex-col gap-2">
            {(
              [
                ["includeEu", T.addEu, "eu"],
                ["includeRs", T.addRs, "rs"],
              ] as const
            ).map(([key, label, id]) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={sel[key]}
                onClick={() => update({ ...sel, [key]: !sel[key] })}
                className="inline-flex items-center gap-3 text-left text-sm"
                data-switch={id}
              >
                <span aria-hidden="true" className={`relative inline-block h-5 w-9 shrink-0 rounded-full border ${sel[key] ? "border-accent bg-accent" : "border-ink-muted bg-surface"}`}>
                  <span className={`absolute top-0.5 size-3.5 rounded-full ${sel[key] ? "left-[18px] bg-white" : "left-0.5 bg-ink-muted"}`} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Below 768 px the counter stays in view under the sticky header while the comparison cards scroll. */}
      <p
        className="sticky top-16 z-20 -mx-4 mt-3 border-y border-rule bg-bg/95 px-4 py-2 text-sm font-medium text-ink backdrop-blur-sm md:hidden"
        data-compare-counter-mobile
      >
        {sel.national.length} of 4 selected
      </p>
      <p aria-live="polite" className="sr-only" data-live>
        {announce}
      </p>

      {/* Legend */}
      <div className="mt-6 flex flex-col gap-2 text-sm" data-legend>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink-muted">Comparability:</span>
          <ComparabilityBadge status="direct" />
          <ComparabilityBadge status="partial" />
          <ComparabilityBadge status="context_only" />
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink-muted">Missing values:</span>
          <MissingValue reason="not_reliably_available" withTooltip />
          <MissingValue reason="not_collected" withTooltip />
          <MissingValue reason="not_comparable" withTooltip />
          <MissingValue reason="not_applicable" withTooltip />
        </p>
      </div>

      {/* Table */}
      <section aria-labelledby="side-by-side" className="mt-10">
        <h2 id="side-by-side">{T.tableHeading}</h2>
        {!enough ? (
          <div className="mt-4">
            <EmptyState title={T.emptyTitle} body={T.emptyBody} />
          </div>
        ) : (
          <>
            {/* ≥ 768 px: table. Tablet: above four columns it scrolls sideways inside its own region; desktop
                (≥ 1024 px) holds up to six portal columns without scrolling. */}
            <div className="mt-4 hidden md:block">
              <StickyScrollRegion className="rounded-lg border border-rule scroll-pl-[174px] xl:scroll-pl-[244px]" label="Comparison table (scrollable)">
                <table className={`compare-table w-full border-collapse bg-surface text-left ${columns.length > 4 ? "min-w-[1020px] lg:min-w-0" : ""}`} data-compare-table>
                  <caption className="sr-only">Comparison of the selected portals; each row shows whether its values can be compared</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="sticky left-0 z-10 w-[170px] bg-surface p-2 text-xs font-semibold text-ink-muted xl:w-[240px] xl:p-3">
                        Dimension
                      </th>
                      {columns.map((p) => (
                        <th
                          key={p.id}
                          scope="col"
                          className={`p-2 align-bottom text-sm font-semibold xl:p-3 ${p.id === "mk" ? "bg-accent-soft text-accent" : "text-ink"} ${
                            p.portalClass === "aggregator" ? "eu-hatch border-l-2 border-dashed border-eu" : ""
                          } ${p.portalClass === "regional_context" ? "border-l-2 border-dashed border-ink-muted" : ""}`}
                          data-column={p.id}
                        >
                          <span className="block">{p.country}</span>
                          <span className="block text-xs font-normal text-ink-muted">{p.domain}</span>
                          {p.portalClass !== "national" ? (
                            <span className="mt-1 block">
                              <ClassBadge portalClass={p.portalClass} />
                            </span>
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-rule align-top" data-row={r.id}>
                        <th scope="row" className="sticky left-0 z-10 bg-surface p-2 shadow-[1px_0_0_var(--rule)] xl:p-3">
                          <RowHead row={r} national={sel.national} />
                        </th>
                        {columns.map((p) => (
                          <td
                            key={p.id}
                            className={`p-2 [overflow-wrap:break-word] xl:p-3 ${p.id === "mk" ? "mk-col" : ""} ${p.portalClass === "aggregator" ? "border-l-2 border-dashed border-eu bg-eu-tint" : ""} ${
                              p.portalClass === "regional_context" ? "border-l-2 border-dashed border-ink-muted" : ""
                            }`}
                          >
                            <CellView c={r.cells[p.id]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </StickyScrollRegion>
            </div>
            {/* < 768 px: one card per dimension listing the selected portals */}
            <ol className="mt-4 space-y-3 md:hidden" data-compare-cards>
              {rows.map((r) => (
                <li key={r.id} className="card p-4" data-row={r.id}>
                  <h3 className="text-base leading-6">
                    <RowHead row={r} national={sel.national} />
                  </h3>
                  <dl className="mt-3 space-y-3">
                    {columns.map((p) => (
                      <div
                        key={p.id}
                        className={`border-l-2 pl-3 ${p.id === "mk" ? "border-accent" : p.portalClass === "aggregator" ? "border-dashed border-eu" : p.portalClass === "regional_context" ? "border-dashed border-ink-muted" : "border-rule"}`}
                      >
                        <dt className={`text-sm font-semibold ${p.id === "mk" ? "text-accent" : "text-ink"}`}>
                          {p.country}
                          {p.portalClass !== "national" ? <span className="ml-2 align-middle">{<ClassBadge portalClass={p.portalClass} />}</span> : null}
                        </dt>
                        <dd className="mt-1">
                          <CellView c={r.cells[p.id]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* Size chart of the selected portals */}
      <section aria-labelledby="compare-size" className="mt-12">
        <h2 id="compare-size">{T.sizeHeading}</h2>
        <p className="mt-2 mb-4 text-[15px] leading-6 text-ink-muted">{T.sizeNote}</p>
        <Chart model={c1} filterIds={sel.national} />
      </section>
    </>
  );
}

export { DEFAULT_SELECTION };
