import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import MDEditor from "@uiw/react-md-editor";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { MarkdownEditorProps } from "./types";

export type { MarkdownEditorProps };

export function MarkdownEditor({
  value,
  onChange,
  className,
  placeholder,
  rows,
  readOnly = false,
  height,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const editorHeight = height ?? (rows ? Math.max(rows * 24, 200) : 280);

  return (
    <div
      data-color-mode={colorMode}
      className={cn("w-full overflow-hidden rounded-md border", className)}
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        height={editorHeight}
        preview={readOnly ? "preview" : "live"}
        hideToolbar={readOnly}
        visibleDragbar={!readOnly}
        textareaProps={{
          placeholder:
            placeholder ?? "Write markdown… (headings, lists, bold, links)",
          readOnly,
        }}
      />
    </div>
  );
}
