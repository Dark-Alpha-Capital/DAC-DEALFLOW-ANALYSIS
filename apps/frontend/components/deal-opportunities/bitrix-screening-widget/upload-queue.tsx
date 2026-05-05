import { FileStack, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fileExtensionFromName,
  formatFileSizeBytes,
  isSupportedUploadFile,
  pendingUploadKey,
  SUPPORTED_UPLOAD_LABEL,
  UPLOAD_ACCEPT_ATTR,
} from "./utils";

export function UploadQueue({
  files,
  onPick,
  onRemove,
  onUpload,
  uploading,
}: {
  files: File[];
  onPick: (picked: File[]) => void;
  onRemove: (key: string) => void;
  onUpload: () => void;
  uploading: boolean;
}) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const accepted: File[] = [];
    const rejected: File[] = [];
    for (const f of picked) {
      if (isSupportedUploadFile(f)) accepted.push(f);
      else rejected.push(f);
    }
    if (rejected.length > 0) {
      const names = rejected
        .slice(0, 3)
        .map((f) => f.name)
        .join(", ");
      const extra =
        rejected.length > 3 ? ` and ${rejected.length - 3} more` : "";
      toast.error(
        `Skipped ${rejected.length} unsupported file${
          rejected.length === 1 ? "" : "s"
        }: ${names}${extra}. Allowed: ${SUPPORTED_UPLOAD_LABEL}.`,
      );
    }
    if (accepted.length > 0) onPick(accepted);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-foreground text-xs font-medium tracking-tight">
          Add files
        </p>
        <p className="text-muted-foreground max-w-[56ch] text-xs leading-relaxed">
          Multi-select supported. Duplicates (same name, size, modified time)
          are merged. {SUPPORTED_UPLOAD_LABEL}.
        </p>
      </div>

      <label
        htmlFor="bitrix-widget-upload"
        className={cn(
          "border-border/20 bg-muted/20 hover:bg-muted/30 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <Paperclip className="text-muted-foreground size-5" aria-hidden />
        <div className="text-center space-y-1">
          <p className="text-foreground text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-muted-foreground text-[11px]">
            {SUPPORTED_UPLOAD_LABEL}
          </p>
        </div>
        <input
          id="bitrix-widget-upload"
          type="file"
          multiple
          accept={UPLOAD_ACCEPT_ATTR}
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
      </label>

      {files.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
            Queued ({files.length})
          </p>
          <ul className="divide-border/20 divide-y">
            {files.map((file) => {
              const key = pendingUploadKey(file);
              const ext = fileExtensionFromName(file.name);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-start justify-between gap-2 py-2 text-xs"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <FileStack
                      className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-foreground truncate font-medium">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {ext === "—" ? "" : `.${ext}`}
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
                        {formatFileSizeBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-7 shrink-0 cursor-pointer"
                    disabled={uploading}
                    onClick={() => onRemove(key)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {files.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading}
          className="cursor-pointer transition-transform active:scale-[0.98]"
          onClick={onUpload}
        >
          {uploading ? (
            <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Paperclip className="mr-2 size-4" />
          )}
          Upload {files.length} file{files.length === 1 ? "" : "s"}
        </Button>
      ) : null}
    </div>
  );
}
