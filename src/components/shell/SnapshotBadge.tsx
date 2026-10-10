"use client";
// "Research snapshot: 8 Oct 2026, 22:21–23:03 UTC" with the "Why snapshot data?" tooltip.
// The label is generated from the snapshot window in the data bundle; nothing here is typed by hand.
import Link from "next/link";
import type { SnapshotInfo } from "@/data/types";
import { CORE_RULE, LIVE_NOTE } from "@/content/copy";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const MONTH_ABBR: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

export function abbreviateMonths(label: string): string {
  return label.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (m) => MONTH_ABBR[m] ?? m);
}

export function SnapshotBadge({ snapshot, variant = "inline" }: { snapshot: SnapshotInfo; variant?: "header" | "inline" }) {
  const full = abbreviateMonths(snapshot.label);
  const chip =
    variant === "header" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2 py-1 text-xs leading-4 font-medium whitespace-nowrap text-ink sm:px-2.5">
        <span aria-hidden="true" className="hidden size-1.5 rounded-full bg-ink-muted sm:inline-block" />
        <span className="hidden xl:inline">{full}</span>
        <span className="xl:hidden">{snapshot.shortLabel}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-1 text-xs leading-4 font-medium text-ink">
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-ink-muted" />
        <span className="hidden sm:inline">{full}</span>
        <span className="sm:hidden">{snapshot.shortLabel}</span>
      </span>
    );
  return (
    <InfoTooltip label="Why snapshot data?" trigger={chip}>
      <span className="block">{CORE_RULE}</span>
      <span className="mt-2 block text-ink-muted">{snapshot.label}</span>
      <span className="block text-ink-muted">{snapshot.localLabel}</span>
      <span className="mt-1 block text-ink-muted">{LIVE_NOTE}</span>
      <Link href="/methodology#snapshot" className="mt-2 inline-block">
        How the snapshot was taken
      </Link>
    </InfoTooltip>
  );
}
