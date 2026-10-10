"use client";
// MK versus Serbia context table, collapsed by default, Context only. A native <details>
// disclosure keeps it keyboard- and no-JS-friendly; below 768 px the table becomes label–value cards.
import type { ContextRow, Row } from "@/data/types";
import { ComparabilityBadge } from "@/components/ui/Badges";
import { DataTable } from "@/components/ui/DataTable";
import { ViewSource } from "@/components/source/SourceBadge";

export function SerbiaContextPanel({ rows }: { rows: ContextRow[] }) {
  const tableRows: Row[] = rows.map((r) => ({ measure: r.measure, mk: r.mk, rs: r.rs, note: r.note }));
  return (
    <details className="card mt-6 border-dashed p-4 lg:p-5" data-serbia-panel>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
        <span>Regional context: North Macedonia and Serbia</span>
        <ComparabilityBadge status="context_only" reason="Regional context only: Serbia is not part of the core comparison." withTooltip={false} />
      </summary>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Regional context only: Serbia is not part of the core comparison, and these figures are not a ranking.
      </p>
      <div className="mt-3">
        <DataTable
          caption="North Macedonia and Serbia, regional context"
          captionHidden
          columns={[
            { key: "measure", header: "Measure" },
            { key: "mk", header: "North Macedonia" },
            { key: "rs", header: "Serbia (context)" },
            { key: "note", header: "Note" },
          ]}
          rows={tableRows}
          renderCell={(row, col) => {
            if (col.key !== "mk" && col.key !== "rs") return undefined;
            const r = rows.find((x) => x.measure === row.measure);
            const target = col.key === "mk" ? r?.mkTarget : r?.rsTarget;
            return (
              <>
                {row[col.key]}
                {target ? (
                  <span className="block">
                    <ViewSource target={target} className="text-xs">
                      View source
                    </ViewSource>
                  </span>
                ) : null}
              </>
            );
          }}
        />
      </div>
    </details>
  );
}
