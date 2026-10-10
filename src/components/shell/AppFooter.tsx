// Footer, identical on every page.
import Link from "next/link";
import type { SnapshotInfo } from "@/data/types";
import { AUTHOR_LINE, LIVE_NOTE } from "@/content/copy";

export function AppFooter({ snapshot }: { snapshot: SnapshotInfo }) {
  return (
    <footer className="mt-24 border-t border-rule bg-surface">
      <div className="frame grid gap-6 py-10 text-sm leading-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-medium text-ink">
            {snapshot.label}. {LIVE_NOTE}
          </p>
          <p className="text-ink-muted">University project · Introduction to Data Science</p>
          <p className="text-ink-muted">{AUTHOR_LINE}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            <li>
              <Link href="/methodology">Methodology</Link>
            </li>
            <li>
              <Link href="/methodology#source-register">Source register</Link>
            </li>
            <li>
              <Link href="/methodology#downloads">Download data</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
