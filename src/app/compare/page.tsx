// /compare: static shell; the selection lives in the URL and is handled on the client.
import type { Metadata } from "next";
import { Suspense } from "react";
import { data } from "@/data";
import { compareRows } from "@/data/views";
import { COMPARE_COPY as T } from "@/content/compare";
import { PAGES } from "@/content/pages";
import { LIVE_NOTE } from "@/content/copy";
import { SnapshotBadge } from "@/components/shell/SnapshotBadge";
import { MethodologyNote } from "@/components/ui/Notes";
import { CompareView } from "@/components/sections/CompareView";
import { CompareFallback } from "@/components/sections/CompareFallback";

export const metadata: Metadata = { title: PAGES.compare.title, description: PAGES.compare.description };

export default function ComparePage() {
  const portals = data.portals.map((p) => ({ id: p.id, country: p.country, domain: p.domain, portalClass: p.portalClass }));
  const rows = compareRows();
  return (
    <div className="frame pt-10 pb-8 lg:pt-14">
      <header className="max-w-[68ch]">
        <h1>{T.h1}</h1>
        <p className="mt-3 text-lg leading-8">{T.lead}</p>
        <p className="mt-2 text-[15px] leading-6 text-ink-muted" data-compare-limits>
          {T.limitsNote}
        </p>
        <div className="mt-3">
          <SnapshotBadge snapshot={data.snapshot} />
        </div>
      </header>
      <div className="mt-8">
        {/* Without JavaScript (or before hydration) the default selection renders as a static table. */}
        <Suspense fallback={<CompareFallback portals={portals} rows={rows} />}>
          <CompareView portals={portals} rows={rows} c1={data.charts.C1} />
        </Suspense>
      </div>
      <section aria-labelledby="how-to-read" className="mt-12">
        <h2 id="how-to-read">{T.howHeading}</h2>
        <ul className="mt-4 max-w-[75ch] list-disc space-y-2 pl-5 text-[15px] leading-6">
          {T.howTo.map((t) => (
            <li key={t}>{t}</li>
          ))}
          <li>
            {data.snapshot.label}. {LIVE_NOTE}
          </li>
        </ul>
        <MethodologyNote href="/methodology#comparability">Count definitions and comparability limitations are listed for every portal.</MethodologyNote>
      </section>
    </div>
  );
}
