"use client";
// Layer chip and "View source" controls that open the global drawer.
import type { SnapshotLayer, SourceTarget } from "@/data/types";
import { useSource } from "./SourceProvider";

const LAYER_TEXT: Record<SnapshotLayer, string> = { S1: "S1", S2: "S2", R1: "R1", V: "V", earlier: "Earlier", docs: "Docs" };

export function SourceBadge({ layer, target, label }: { layer: SnapshotLayer | null; target: SourceTarget; label?: string }) {
  const { open } = useSource();
  const text = layer ? LAYER_TEXT[layer] : "Source";
  const base = label ?? "View source";
  // WCAG 2.5.3 Label in Name: the accessible name always contains the visible chip text.
  const name = base.toLowerCase().includes(text.toLowerCase()) ? base : `${base} (layer ${text})`;
  return (
    <button
      type="button"
      onClick={() => open(target)}
      className="inline-flex items-center rounded border border-rule bg-surface px-1.5 font-mono text-[11px] leading-5 text-ink-muted hover:border-accent hover:text-accent"
      aria-label={name}
    >
      {text}
    </button>
  );
}

export function ViewSource({
  target,
  children = "View source",
  className = "",
  describedBy,
}: {
  target: SourceTarget;
  children?: React.ReactNode;
  className?: string;
  describedBy?: string;
}) {
  const { open } = useSource();
  return (
    <button
      type="button"
      onClick={() => open(target)}
      aria-describedby={describedBy}
      className={`text-sm text-accent underline decoration-1 underline-offset-[3px] hover:decoration-2 ${className}`}
    >
      {children}
    </button>
  );
}
