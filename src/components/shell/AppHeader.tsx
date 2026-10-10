// Sticky 64 px header: wordmark with subtitle, primary navigation, snapshot badge.
// Below 1024 px the navigation moves into the MobileMenu sheet.
import Link from "next/link";
import { data } from "@/data";
import { HERO } from "@/content/copy";
import { NavLinks } from "./NavLinks";
import { MobileMenu } from "./MobileMenu";
import { SnapshotBadge } from "./SnapshotBadge";
import { groupPortals } from "./portalNav";

export function AppHeader() {
  const groups = groupPortals(data.portals);
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-rule bg-bg/95 backdrop-blur-sm">
      <div className="frame flex h-full items-center justify-between gap-2 sm:gap-4">
        {/* Named by its visible text (WCAG 2.5.3 Label in Name), plus "home" for screen readers */}
        <Link href="/" className="flex shrink-0 flex-col no-underline">
          <span className="font-serif text-lg leading-6 font-semibold text-ink sm:text-xl">{HERO.title}</span>
          <span className="hidden truncate text-xs leading-4 text-ink-muted xl:block">{HERO.subtitle}</span>
          <span className="sr-only">, home</span>
        </Link>
        <nav aria-label="Primary" className="hidden lg:block">
          <NavLinks groups={groups} />
        </nav>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <SnapshotBadge snapshot={data.snapshot} variant="header" />
          <div className="lg:hidden">
            <MobileMenu groups={groups} />
          </div>
        </div>
      </div>
    </header>
  );
}
