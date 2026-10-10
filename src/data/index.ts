// Typed accessors over the generated bundle. Pages read data only through this module.
// The bundle is produced by `npm run data` (runs automatically before `dev` and `build`).
import raw from "./generated/opendatascope.json";
import { formatDerived } from "./tokens";
import { fmtMetricValue } from "./format";
import type {
  AccessCapability,
  Bundle,
  DerivedValue,
  FeatureId,
  Metric,
  Portal,
  PortalId,
  ResolvedMetric,
  SourceRecord,
  ValidationReading,
} from "./types";

export const data = raw as unknown as Bundle;

export const FEATURES: FeatureId[] = ["api", "formats", "metadata_standard", "licensing", "hvd", "publishers", "metadata_activity", "themes"];

export const FEATURE_LABEL: Record<FeatureId, string> = {
  api: "API availability",
  formats: "Machine-readable formats",
  metadata_standard: "Metadata standard",
  licensing: "Licensing information",
  hvd: "HVD information",
  publishers: "Publisher information",
  metadata_activity: "Metadata activity",
  themes: "Themes",
};

export function portal(id: PortalId): Portal {
  const p = data.portals.find((x) => x.id === id);
  if (!p) throw new Error(`unknown portal ${id}`);
  return p;
}

export function portalBySlug(slug: string): Portal | undefined {
  return data.portals.find((p) => p.slug === slug);
}

export function metric(id: string): Metric {
  const m = data.metrics[id];
  if (!m) throw new Error(`unknown metric ${id}`);
  return m;
}

/** A metric with its formatted value, its later readings and its source record, ready to pass as props. */
export function resolveMetric(id: string): ResolvedMetric {
  const m = metric(id);
  return {
    ...m,
    display: m.value === null ? "" : fmtMetricValue(m.value, m.unit),
    validation: data.validation.filter((v) => v.canonicalMetricId === id),
    source: source(m.sourceId),
  };
}

export function metricDisplay(id: string): string {
  const m = metric(id);
  return fmtMetricValue(m.value, m.unit);
}

export function derived(id: string): DerivedValue {
  const d = data.derived[id];
  if (!d) throw new Error(`unknown derived value ${id}`);
  return d;
}

export function derivedDisplay(id: string): string {
  return formatDerived(derived(id));
}

export function text(key: string): string {
  const t = data.content.text[key];
  if (t === undefined) throw new Error(`unknown copy key ${key}`);
  return t;
}

export function source(id: string): SourceRecord {
  const s = data.sources.find((x) => x.id === id);
  if (!s) throw new Error(`unknown source ${id}`);
  return s;
}

export function cell(portalId: PortalId, feature: FeatureId): AccessCapability {
  const c = data.access.find((a) => a.portalId === portalId && a.feature === feature);
  if (!c) throw new Error(`no matrix cell ${portalId}.${feature}`);
  return c;
}

export function readingsFor(portalId: PortalId): ValidationReading[] {
  return data.validation.filter((v) => v.portalId === portalId);
}

export function metricsFor(portalId: PortalId): Metric[] {
  return Object.values(data.metrics).filter((m) => m.portalId === portalId);
}

export function sourcesFor(portalId: PortalId): SourceRecord[] {
  return data.sources.filter((s) => s.portalIds.includes(portalId));
}

export const nationalPortals = (): Portal[] => data.portals.filter((p) => p.portalClass === "national");
