"use client";
// Portal-page tables with per-row source controls.
import type { Row, ValidationReading } from "@/data/types";
import { fmtReadingTime, fmtReadingValue, fmtSigned, NBSP } from "@/data/format";
import { DataTable } from "@/components/ui/DataTable";
import { ViewSource } from "@/components/source/SourceBadge";

function diff(r: ValidationReading): string | null {
  if (r.visibleNumber === null || r.difference === null) return null;
  if (r.difference === 0) return "no difference";
  return `${fmtSigned(r.difference)}${r.differencePct !== null ? ` (${fmtSigned(r.differencePct, 3)}${NBSP}%)` : ""}`;
}

export function ValidationTable({ readings, caption }: { readings: ValidationReading[]; caption: string }) {
  const rows: Row[] = readings.map((r) => ({
    id: r.id,
    reading: r.metric,
    value: fmtReadingValue(r.visibleValue, r.visibleNumber),
    kind: r.layer === "V" ? "Later validation reading" : "Earlier reading (superseded)",
    time: fmtReadingTime(r.readingTime),
    diff: diff(r),
    diff__missing: "not_applicable",
    note: r.visibleValue.startsWith("HTTP 504") && !/^Timeout, not missing data/.test(r.note) ? `Timeout, not missing data. ${r.note}` : r.note || "—",
  }));
  return (
    <DataTable
      caption={caption}
      columns={[
        { key: "reading", header: "Reading", primary: true },
        { key: "value", header: "Visible value", align: "right" },
        { key: "kind", header: "Kind" },
        { key: "time", header: "Reading time" },
        { key: "diff", header: "Difference from canonical", align: "right" },
        { key: "note", header: "Note" },
        { key: "record", header: "Record" },
      ]}
      rows={rows}
      renderCell={(row, col) =>
        col.key === "record" ? (
          <ViewSource target={{ readingId: String(row.id) }} className="text-sm">
            Reading record
          </ViewSource>
        ) : col.key === "note" && row.note === "—" ? (
          <span className="text-ink-muted">No note</span>
        ) : undefined
      }
    />
  );
}

export function ProvenanceTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <DataTable
      caption={caption}
      columns={[
        { key: "portal", header: "Portal", primary: true },
        { key: "catalogue", header: "Catalogue on data.europa.eu" },
        { key: "harvested", header: "Harvested records", align: "right" },
        { key: "canonical", header: "National canonical count", align: "right" },
        { key: "note", header: "Note" },
      ]}
      rows={rows}
      renderCell={(row, col) => {
        if (col.key === "harvested")
          return (
            <>
              {row.harvested}{" "}
              <ViewSource target={{ metricId: String(row.metricId) }} className="text-xs">
                View source
              </ViewSource>
            </>
          );
        if (col.key === "canonical")
          return (
            <>
              {row.canonical}{" "}
              <ViewSource target={{ metricId: String(row.headId) }} className="text-xs">
                View source
              </ViewSource>
            </>
          );
        return undefined;
      }}
    />
  );
}
