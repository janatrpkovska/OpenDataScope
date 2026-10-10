// Marks Macedonian (Cyrillic) words inside English text with lang="mk",
// e.g. the title prefixes "Општина" and "Град Скопје" quoted in the local-government project rule.
import { Fragment } from "react";

const CYRILLIC_RUN = /([Ѐ-ӿ]+(?:[\s-]+[Ѐ-ӿ]+)*)/;

export function LangText({ text }: { text: string }) {
  const parts = text.split(CYRILLIC_RUN);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} lang="mk">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
