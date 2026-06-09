import "@mdxeditor/editor/style.css";

import * as React from "react";
import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { cn } from "@/lib/utils";

export interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  className,
  placeholder,
  rows,
  readOnly = false,
}: MarkdownEditorProps) {
  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <MDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn("bg-background rounded-md border")}
        style={{ minHeight: rows ? `${rows * 24}px` : "260px" }}
        plugins={[
          toolbarPlugin({
            toolbarClassName:
              "border-b bg-muted/40 px-2 py-1 flex flex-wrap items-center gap-1",
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <StrikeThroughSupSubToggles />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <BlockTypeSelect />
                <Separator />
                <CreateLink />
                <InsertTable />
                <InsertThematicBreak />
                <Separator />
                <ConditionalContents
                  options={[
                    {
                      when: (editor) => editor?.editorType === "codeblock",
                      contents: () => null,
                    },
                    { fallback: () => <InsertCodeBlock /> },
                  ]}
                />
              </DiffSourceToggleWrapper>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          quotePlugin(),
          tablePlugin(),
          thematicBreakPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              "": "Plain text",
              js: "JavaScript",
              ts: "TypeScript",
              py: "Python",
              sql: "SQL",
              bash: "Bash",
            },
          }),
          diffSourcePlugin({ viewMode: "rich-text" }),
          markdownShortcutPlugin(),
        ]}
      />
      {!readOnly && (
        <p className="text-muted-foreground text-xs">
          Supports rich text — headings, tables, code blocks, links, and more.
          Toggle source view for raw Markdown.
        </p>
      )}
    </div>
  );
}
