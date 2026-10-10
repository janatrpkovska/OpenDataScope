// Compare selection and row-badge rules. Pure functions, unit-tested.
import type { CompareRow, CompareSelection, ComparabilityStatus, PortalId } from "./types";

export const NATIONAL_ORDER: PortalId[] = ["mk", "uk", "us", "de", "fr", "nl", "es"];
export const DEFAULT_SELECTION: CompareSelection = { national: ["mk", "uk", "us", "nl"], includeEu: false, includeRs: false };
export type CompareNotice = "reset" | "max" | "toggle";

export function parseSelection(params: { get(name: string): string | null }): { selection: CompareSelection; notices: CompareNotice[] } {
  const notices: CompareNotice[] = [];
  let national: PortalId[] = DEFAULT_SELECTION.national;
  const raw = params.get("portals");
  if (raw !== null) {
    const seen: PortalId[] = [];
    for (const part of raw.split(",")) {
      const id = part.trim().toLowerCase() as PortalId;
      if (NATIONAL_ORDER.includes(id) && !seen.includes(id)) seen.push(id); // unknown or duplicate IDs are dropped
    }
    if (seen.length < 2) {
      national = DEFAULT_SELECTION.national;
      notices.push("reset");
    } else if (seen.length > 4) {
      national = seen.slice(0, 4);
      notices.push("max");
    } else national = seen;
  }
  const flag = (name: string): boolean => {
    const v = params.get(name);
    if (v === null || v === "0") return false;
    if (v === "1") return true;
    if (!notices.includes("toggle")) notices.push("toggle");
    return false;
  };
  const includeEu = flag("eu");
  const includeRs = flag("rs");
  return { selection: { national: sortNational(national), includeEu, includeRs }, notices };
}

export function sortNational(ids: PortalId[]): PortalId[] {
  return [...ids].sort((a, b) => NATIONAL_ORDER.indexOf(a) - NATIONAL_ORDER.indexOf(b));
}

export function selectionToQuery(s: CompareSelection): string {
  return `portals=${sortNational(s.national).join(",")}&eu=${s.includeEu ? 1 : 0}&rs=${s.includeRs ? 1 : 0}`;
}

const STRENGTH: Record<ComparabilityStatus, number> = { direct: 3, partial: 2, context_only: 1 };

/**
 * Row badge (L2): the weakest status among the selected national cells that hold a value. The EU and Serbia
 * columns keep their own cell badges and never lower the row badge. Fewer than two national values → null,
 * shown as "Not comparable in this selection".
 */
export function rowBadge(row: CompareRow, national: PortalId[]): ComparabilityStatus | null {
  const statuses = national.map((id) => row.cells[id]?.status ?? null).filter((s): s is ComparabilityStatus => s !== null);
  if (statuses.length < 2) return null;
  return statuses.reduce((w, s) => (STRENGTH[s] < STRENGTH[w] ? s : w));
}
