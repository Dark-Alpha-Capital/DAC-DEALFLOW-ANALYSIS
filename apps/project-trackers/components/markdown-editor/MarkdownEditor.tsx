import * as React from "react";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  MDXEditor,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ConditionalContents,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  applyBlockType$,
  currentBlockType$,
  insertMarkdown$,
  rootEditor$,
  useCellValue,
  usePublisher,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type BlockType,
} from "@mdxeditor/editor";
import { Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "quote", label: "Quote" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
];

/**
 * MDXEditor's own block-type dropdown and link/image dialogs render as
 * non-portaled, absolutely-positioned elements with low z-index. Nested
 * inside a Dialog (transform + overflow-hidden) or a fixed side panel, they
 * end up clipped or painted underneath — invisible and unclickable. These
 * three replace them with our own Radix Select/Popover (already proven to
 * portal correctly everywhere in this app), driven by MDXEditor's public
 * command API instead of its built-in UI.
 */
function BlockTypeToolbarSelect() {
  const blockType = useCellValue(currentBlockType$);
  const applyBlockType = usePublisher(applyBlockType$);
  const rootEditor = useCellValue(rootEditor$);
  return (
    <Select
      value={blockType || "paragraph"}
      onValueChange={(v) => {
        // Opening the (portaled) dropdown moves DOM focus away from the
        // Lexical editor, which clears its selection — applyBlockType$
        // silently no-ops without one. Refocus the editor (Lexical restores
        // its last selection) and only apply the change once that's done.
        if (rootEditor) {
          rootEditor.focus(() => applyBlockType(v as BlockType));
        } else {
          applyBlockType(v as BlockType);
        }
      }}
    >
      <SelectTrigger className="h-7 w-32 border-none bg-transparent text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BLOCK_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InsertLinkToolbarButton() {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  function close() {
    setOpen(false);
    setText("");
    setUrl("");
  }

  function submit() {
    if (!url.trim()) return;
    insertMarkdown(`[${text.trim() || url.trim()}](${url.trim()})`);
    close();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-7" title="Insert link">
          <LinkIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="start">
        <Input placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button type="button" size="sm" className="w-full" disabled={!url.trim()} onClick={submit}>
          Insert link
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function InsertImageToolbarButton() {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setAlt("");
    setUrl("");
  }

  function submitUrl() {
    if (!url.trim()) return;
    insertMarkdown(`![${alt.trim()}](${url.trim()})`);
    close();
  }

  async function submitFile(file: File) {
    const dataUrl = await uploadImageAsDataUrl(file);
    insertMarkdown(`![${alt.trim()}](${dataUrl})`);
    close();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-7" title="Insert image">
          <ImageIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="start">
        <Input placeholder="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
        <Input
          placeholder="Image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitUrl()}
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!url.trim()}
          onClick={submitUrl}
        >
          Insert from URL
        </Button>
        <div className="text-muted-foreground text-center text-xs">or</div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void submitFile(file);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  className,
  placeholder,
  rows,
  readOnly = false,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const minHeight = rows ? `${rows * 24}px` : "260px";

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <div
        className="bg-background rounded-md border"
        style={{ ["--md-min-h" as string]: minHeight } as React.CSSProperties}
      >
        <MDXEditor
          markdown={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={isDark ? "dark-theme" : "light-theme"}
          contentEditableClassName="prose prose-sm dark:prose-invert max-w-none min-h-[var(--md-min-h)] px-3 py-2 text-foreground focus:outline-none"
          plugins={[
            toolbarPlugin({
              toolbarClassName:
                "rounded-t-md border-b bg-muted/40 px-2 py-1 flex flex-wrap items-center gap-1",
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <StrikeThroughSupSubToggles />
                  <CodeToggle />
                  <Separator />
                  <ListsToggle />
                  <BlockTypeToolbarSelect />
                  <Separator />
                  <InsertLinkToolbarButton />
                  <InsertImageToolbarButton />
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
                </>
              ),
            }),
            headingsPlugin(),
            listsPlugin(),
            linkPlugin(),
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
            markdownShortcutPlugin(),
          ]}
        />
      </div>
      {!readOnly && (
        <p className="text-muted-foreground text-xs">
          Supports rich text, images, links, tables, and code blocks.
        </p>
      )}
    </div>
  );
}
