"use client";
// Methodology tables with per-row controls: validation register (sideways scroll on mobile),
// drift table, derived-value table, count definitions and source register.
import type { Row, SourceRecord } from "@/data/types";
import { DataTable } from "@/components/ui/DataTable";
import { ViewSource } from "@/components/source/SourceBadge";
import { SourceLinkView } from "@/components/source/SourceDrawer";
import { ProjectIndicatorLabel } from "@/components/ui/Badges";
import { LangText } from "@/components/ui/LangText";

export function ReadingTable({ rows, caption, scroll = false, columns }: { rows: Row[]; caption: string; scroll?: boolean; columns: { key: string; header: string; align?: "left" | "right"; primary?: boolean }[] }) {
  return (
    <DataTable
      caption={caption}
      mobile={scroll ? "scroll" : "cards"}
      columns={[...columns, { key: "record", header: "Record" }]}
      rows={rows}
      renderCell={(row, col) =>
        col.key === "record" ? (
          <ViewSource target={{ readingId: String(row.id) }} className="text-sm">
            Reading record
          </ViewSource>
        ) : col.key === "note" && !row.note ? (
          <span className="text-ink-muted">No note</span>
        ) : undefined
      }
    />
  );
}

export function DerivedTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <DataTable
      caption={caption}
      columns={[
        { key: "indicator", header: "Indicator", primary: true },
        { key: "formula", header: "Formula" },
        { key: "value", header: "Value", align: "right" },
        { key: "project", header: "Kind" },
        { key: "record", header: "Record" },
      ]}
      rows={rows}
      renderCell={(row, col) => {
        if (col.key === "project")
          return row.rule ? <ProjectIndicatorLabel rule={row.rule as "open_format" | "machine_readable" | "local_government"} /> : <span>Derived value</span>;
        if (col.key === "record")
          return (
            <ViewSource target={{ derivedId: String(row.id) }} className="inline-block min-h-6 text-sm leading-6">
              How is this calculated?
            </ViewSource>
          );
        if (col.key === "formula")
          return (
            <code className="font-mono text-xs">
              <LangText text={String(row.formula)} />
            </code>
          );
        return undefined;
      }}
    />
  );
}

export function CountTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <DataTable
      caption={caption}
      columns={[
        { key: "portal", header: "Portal", primary: true },
        { key: "unit", header: "Unit" },
        { key: "definition", header: "Count definition" },
        { key: "nonOpen", header: "Includes non-open" },
        { key: "note", header: "Comparability note" },
        { key: "record", header: "Record" },
      ]}
      rows={rows}
      renderCell={(row, col) =>
        col.key === "record" ? <ViewSource target={{ metricId: String(row.metricId) }} className="text-sm" /> : undefined
      }
    />
  );
}

/** Text with line-break opportunities after "-", "_" and "/" (identifiers, ISO time windows). */
function breakable(text: string) {
  return text.split(/(?<=[-_/])/).map((part, i) => (
    <span key={i}>
      {i ? <wbr /> : null}
      {part}
    </span>
  ));
}

export function SourceRegisterTable({ rows, sources, caption }: { rows: Row[]; sources: SourceRecord[]; caption: string }) {
  return (
    <DataTable
      caption={caption}
      sortable
      columns={[
        { key: "id", header: "ID" },
        { key: "title", header: "Source", primary: true },
        { key: "type", header: "Type" },
        { key: "layer", header: "Layer" },
        { key: "retrieved", header: "Retrieved" },
        { key: "url", header: "Link", sortable: false },
        { key: "record", header: "Record", sortable: false },
      ]}
      rows={rows}
      renderCell={(row, col) => {
        const s = sources.find((x) => x.id === row.id)!;
        // Ids and reading windows may wrap after "-", "_" or "/" (never mid-word), so the register stays a
        // table on a 768 px tablet
        if (col.key === "id") return <code className="font-mono text-xs">{breakable(s.id)}</code>;
        if (col.key === "retrieved") return breakable(String(row.retrieved ?? ""));
        if (col.key === "url") return <SourceLinkView source={s} label={s.sourceType === "api_snapshot" || s.sourceType === "page_reading" ? "Open official source" : "Open source"} />;
        if (col.key === "record")
          return (
            <ViewSource target={{ sourceId: s.id }} className="text-sm">
              Source record
            </ViewSource>
          );
        return undefined;
      }}
    />
  );
}
