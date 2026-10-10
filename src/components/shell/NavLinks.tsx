"use client";
// Primary navigation in story order. The active item is underlined in the accent colour.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/content/copy";
import type { NavKey } from "@/data/types";
import { PortalMenu } from "./PortalMenu";
import type { PortalNavGroup } from "./portalNav";

export function navKeyFor(pathname: string): NavKey | null {
  if (pathname === "/") return "overview";
  if (pathname.startsWith("/north-macedonia")) return "north-macedonia";
  if (pathname.startsWith("/compare")) return "compare";
  if (pathname.startsWith("/country/")) return "portals";
  if (pathname.startsWith("/methodology")) return "methodology";
  return null;
}

export function NavLinks({ groups }: { groups: PortalNavGroup[] }) {
  const pathname = usePathname();
  const current = navKeyFor(pathname);
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((item) => (
        <li key={item.key}>
          {item.href === null ? (
            <PortalMenu groups={groups} active={current === "portals"} />
          ) : (
            <Link
              href={item.href}
              aria-current={current === item.key ? "page" : undefined}
              className={`nav-link ${current === item.key ? "nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
