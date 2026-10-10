// A generated sentence with its "View evidence" control. Server component: the text comes from the
// build-time bundle; the control opens the statement record listing every value in the sentence and its inputs.
import { text } from "@/data";
import { ViewSource } from "./SourceBadge";

export function Evidence({
  k,
  as: Tag = "p",
  className = "",
  label = "View evidence",
}: {
  /** A key of TEXT_TEMPLATES (src/content/text.ts). */
  k: string;
  as?: "p" | "span" | "div";
  className?: string;
  label?: string;
}) {
  return (
    <Tag className={className} data-statement={`text.${k}`}>
      {text(k)}{" "}
      <ViewSource target={{ statement: `text.${k}` }} className="text-xs whitespace-nowrap">
        {label}
      </ViewSource>
    </Tag>
  );
}
