"use client";

import "@mdxeditor/editor/style.css";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ListsToggle,
  UndoRedo,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { cn } from "@/lib/utils";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  className,
  placeholder,
  rows,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <MDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "bg-background rounded-md border",
          isDark && "dark-theme",
          rows ? `min-h-[${rows * 24}px]` : "min-h-[260px]",
        )}
        plugins={[
          toolbarPlugin({
            toolbarClassName:
              "border-b bg-muted/40 px-2 py-1 flex flex-wrap items-center gap-1",
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <ListsToggle />
                <BlockTypeSelect />
              </>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          linkPlugin(),
          markdownShortcutPlugin(),
          quotePlugin(),
        ]}
      />
      <p className="text-muted-foreground text-xs">
        Supports Markdown for rich text (headings, lists, links, etc.).
      </p>
    </div>
  );
}
