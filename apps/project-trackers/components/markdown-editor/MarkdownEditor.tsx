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
  InsertImage,
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
  imagePlugin,
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

async function uploadImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
      <div
        className="bg-background rounded-md border [&_.mdxeditor]:min-h-[inherit]"
        style={{ minHeight: rows ? `${rows * 24}px` : "260px" }}
      >
        <MDXEditor
          markdown={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className="min-h-[inherit]"
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
                <InsertImage />
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
          imagePlugin({ imageUploadHandler: uploadImageAsDataUrl }),
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
      </div>
      {!readOnly && (
        <p className="text-muted-foreground text-xs">
          Supports rich text, images, links, tables, and code blocks. Toggle
          source view for raw Markdown.
        </p>
      )}
    </div>
  );
}
