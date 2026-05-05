import { FileStack, Loader2, Upload, X } from "lucide-react";
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
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="bitrix-widget-upload"
          className="text-muted-foreground block text-[10px] font-semibold tracking-[0.16em] uppercase"
        >
          Add files to deal
        </label>
        <p className="text-muted-foreground max-w-[62ch] text-[12px] leading-relaxed">
          Multi-select supported. Duplicates (same name, size, modified time)
          are merged. New uploads join the deal index once processed.
        </p>
        <p className="text-muted-foreground/80 text-[11px] leading-relaxed">
          Supported · {SUPPORTED_UPLOAD_LABEL}
        </p>
      </div>
      <input
        id="bitrix-widget-upload"
        type="file"
        multiple
        accept={UPLOAD_ACCEPT_ATTR}
        onChange={(e) => {
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
        }}
        className={cn(
          "block w-full cursor-pointer text-sm",
          "file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium",
          "file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80",
        )}
      />
      {files.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
            Ready to upload ({files.length})
          </p>
          <ul className="divide-border/60 border-border/60 divide-y border-y">
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
                          {ext === "—" ? "no ext" : `.${ext}`}
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
                        {formatFileSizeBytes(file.size)}
                        {file.type ? <> · {file.type}</> : null}
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
                    aria-label={`Remove ${file.name} from upload list`}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={files.length === 0 || uploading}
        className="cursor-pointer"
        onClick={onUpload}
      >
        {uploading ? (
          <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <Upload className="mr-2 size-4" />
        )}
        Upload{files.length > 0 ? ` (${files.length})` : ""}
      </Button>
    </div>
  );
}
