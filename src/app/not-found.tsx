// 404: static; links to Overview, Compare and the portal list.
import type { Metadata } from "next";
import Link from "next/link";
import { data, resolveMetric } from "@/data";
import { COUNTRY_COPY as T } from "@/content/country";
import { PAGES } from "@/content/pages";
import { PortalCard } from "@/components/sections/CountryParts";

export const metadata: Metadata = { title: PAGES.notFound.title, description: PAGES.notFound.description };

export default function NotFound() {
  return (
    <div className="frame pt-12 pb-8 lg:pt-16">
      <h1>{T.notFoundTitle}</h1>
      <p className="mt-3 text-lg leading-8">{T.notFoundBody}</p>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">{T.notFoundHelp}</p>
      <p className="mt-4 flex flex-wrap gap-4">
        <Link href="/">Overview</Link>
        <Link href="/compare">Compare</Link>
      </p>
      <h2 className="mt-10">Portals in the comparison</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.portals.map((p) => (
          <PortalCard key={p.id} portal={p} headline={resolveMetric(p.headlineMetricId)} />
        ))}
      </div>
    </div>
  );
}
