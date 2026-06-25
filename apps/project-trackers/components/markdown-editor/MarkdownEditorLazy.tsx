import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MarkdownEditorProps } from "./MarkdownEditor";

const MarkdownEditorInner = lazy(() =>
  import("./MarkdownEditor").then((m) => ({ default: m.MarkdownEditor })),
);

function EditorFallback({
  value,
  className,
}: Pick<MarkdownEditorProps, "value" | "className">) {
  return (
    <textarea
      readOnly
      value={value}
      className={className}
      rows={6}
      aria-label="Markdown editor loading"
    />
  );
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <ClientOnly
      fallback={
        <EditorFallback value={props.value} className={props.className} />
      }
    >
      <Suspense
        fallback={
          <EditorFallback value={props.value} className={props.className} />
        }
      >
        <MarkdownEditorInner {...props} />
      </Suspense>
    </ClientOnly>
  );
}
