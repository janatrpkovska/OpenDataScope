// Methodology pieces.
import type { DownloadFile } from "@/data/types";
import { fmtInt } from "@/data/format";
import { Download } from "lucide-react";

export function ProcessSteps({ steps }: { steps: { n: number; title: string; detail: string; evidence?: React.ReactNode }[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2" data-process-steps>
      {steps.map((s) => (
        <li key={s.n} className="card grid grid-cols-[2.25rem_1fr] gap-x-3 p-4">
          <span aria-hidden="true" className="font-serif text-2xl leading-8 font-semibold text-accent">
            {s.n}
          </span>
          <div>
            <h3 className="text-base leading-6">
              <span className="sr-only">Step {s.n}: </span>
              {s.title}
            </h3>
            <p className="mt-1 text-[15px] leading-6 text-ink">
              {s.detail}
              {s.evidence ? <> {s.evidence}</> : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function kb(bytes: number): string {
  return bytes >= 1024 ? `${fmtInt(Math.round(bytes / 1024))} KB` : `${fmtInt(bytes)} bytes`;
}

export function DownloadPanel({ files, manifestLabel }: { files: DownloadFile[]; manifestLabel: string }) {
  return (
    <div className="card overflow-hidden" data-download-panel>
      <ul className="divide-y divide-rule">
        {files.map((f) => {
          const name = f.path.replace(/^data\//, "");
          return (
            <li key={name} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,2fr)] md:items-center md:gap-4" data-download={name}>
              <a href={`/data/${name}`} download className="inline-flex items-center gap-1.5 font-medium break-all">
                <Download aria-hidden="true" size={15} />
                {name}
              </a>
              <span className="text-sm text-ink-muted">
                {f.origin === "phase1" ? "Phase 1 table (frozen)" : "Reference table"} · {fmtInt(f.rows)} rows · {kb(f.bytes)}
              </span>
              <code className="font-mono text-xs break-all text-ink-muted" title="SHA-256">
                {f.sha256}
              </code>
            </li>
          );
        })}
        <li className="px-4 py-3">
          <a href="/data/manifest.json" download className="inline-flex items-center gap-1.5 font-medium">
            <Download aria-hidden="true" size={15} />
            {manifestLabel}
          </a>
        </li>
      </ul>
    </div>
  );
}
