// Server-rendered default comparison (mk, uk, us, nl) shown before hydration and without JavaScript.
import type { CompareRow, Portal } from "@/data/types";
import { DEFAULT_SELECTION, rowBadge } from "@/data/compare";
import { COMPARE_COPY as T } from "@/content/compare";
import { ComparabilityBadge, MissingValue } from "@/components/ui/Badges";

export function CompareFallback({ portals, rows }: { portals: Pick<Portal, "id" | "country">[]; rows: CompareRow[] }) {
  const cols = DEFAULT_SELECTION.national.map((id) => portals.find((p) => p.id === id)!);
  return (
    <div className="scroll-x rounded-lg border border-rule" data-compare-fallback>
      <table className="w-full min-w-[720px] border-collapse bg-surface text-left text-sm">
        <caption className="p-3 text-left font-semibold">Default comparison: North Macedonia, United Kingdom, United States and Netherlands</caption>
        <thead>
          <tr>
            <th scope="col" className="p-3">
              Dimension
            </th>
            {cols.map((p) => (
              <th key={p.id} scope="col" className="p-3">
                {p.country}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = rowBadge(r, DEFAULT_SELECTION.national);
            return (
              <tr key={r.id} className="border-t border-rule align-top">
                <th scope="row" className="p-3">
                  {r.label} {b ? <ComparabilityBadge status={b} size="sm" withTooltip={false} /> : <span className="text-xs text-ink-muted">{T.notComparable}</span>}
                </th>
                {cols.map((p) => {
                  const c = r.cells[p.id]!;
                  const missing = c.state !== "available" && c.state !== "limited";
                  return (
                    <td key={p.id} className="p-3">
                      {missing ? <MissingValue reason={c.state as "not_collected"} /> : c.display}
                      {c.secondary ? <span className="block text-xs text-ink-muted">{c.secondary}</span> : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
