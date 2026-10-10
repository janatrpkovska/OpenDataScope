// Grouped portal list shared by the desktop Portals menu and the mobile sheet.
import type { PortalClass, PortalId } from "@/data/types";

export interface PortalNavItem {
  id: PortalId;
  country: string;
  domain: string;
  href: string;
}
export interface PortalNavGroup {
  key: PortalClass;
  label: string;
  items: PortalNavItem[];
}

export function portalHref(p: { id: string; slug: string }): string {
  return p.id === "mk" ? "/north-macedonia" : `/country/${p.slug}`;
}

export function groupPortals(
  portals: { id: PortalId; slug: string; country: string; domain: string; portalClass: PortalClass }[],
): PortalNavGroup[] {
  const groups: { key: PortalClass; label: string }[] = [
    { key: "national", label: "National portals" },
    { key: "aggregator", label: "EU aggregator" },
    { key: "regional_context", label: "Regional context" },
  ];
  return groups.map((g) => ({
    ...g,
    items: portals
      .filter((p) => p.portalClass === g.key)
      .map((p) => ({ id: p.id, country: p.country, domain: p.domain, href: portalHref(p) })),
  }));
}
