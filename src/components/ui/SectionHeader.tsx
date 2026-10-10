// H2 or H3 with an anchor, a lead sentence and an optional comparability badge.
import type { ComparabilityStatus } from "@/data/types";
import { ComparabilityBadge } from "./Badges";

export function SectionHeader({
  id,
  title,
  lead,
  level = 2,
  status,
  statusReason,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  level?: 2 | 3;
  status?: ComparabilityStatus;
  statusReason?: string;
  children?: React.ReactNode;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <header className="mb-6 max-w-[68ch]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <H id={id} className="scroll-mt-2">
          {title}
        </H>
        {status ? <ComparabilityBadge status={status} reason={statusReason} /> : null}
      </div>
      {lead ? <p className="mt-2 text-[17px] leading-7 text-ink">{lead}</p> : null}
      {children}
    </header>
  );
}
