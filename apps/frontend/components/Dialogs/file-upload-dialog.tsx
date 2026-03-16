"use client";

import type React from "react";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilesIcon, Loader2, Upload, X } from "lucide-react";
import { cn, getFileIcon, formatFileSize } from "@/lib/utils";
import { toast } from "sonner";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type EntityType = "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY";

interface UploadFile {
  file: File;
  preview?: string;
}

interface FileUploadDialogProps {
  entityType: EntityType;
  entityId: string;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

const createFilePreview = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      resolve(undefined);
    }
  });
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
};

export function FileUploadDialog({
  entityType,
  entityId,
  acceptedTypes = ["*/*"],
  maxFileSize = 50,
}: FileUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<UploadFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();

  const { mutate: uploadFile, isPending: isUploadingFile } = useMutation(
    trpc.files.uploadFile.mutationOptions({
      onSuccess: () => {
        toast.success("File uploaded successfully", {
          description: "The file has been uploaded.",
        });
        setFile(null);
        setIsOpen(false);
      },
      onError: (error) => {
        console.error("Upload failed:", error);
        toast.error("Upload failed", {
          description:
            error.message ||
            "The file could not be uploaded. Please try again.",
        });
      },
    }),
  );

  const { mutate: uploadZip, isPending: isUploadingZip } = useMutation(
    trpc.files.uploadZip.mutationOptions({
      onSuccess: (data) => {
        toast.success("Zip uploaded successfully", {
          description: `${data.count} files are being processed.`,
        });
        setFile(null);
        setIsOpen(false);
      },
      onError: (error) => {
        console.error("Zip upload failed:", error);
        toast.error("Zip upload failed", {
          description:
            error.message ||
            "The zip could not be uploaded. Please try again.",
        });
      },
    }),
  );

  const isPending = isUploadingFile || isUploadingZip;
  const isZipSupported =
    entityType === "COMPANY" || entityType === "DEAL_OPPORTUNITY";

  const handleSelectedFile = async (selected: File) => {
    const isZip = selected.name.toLowerCase().endsWith(".zip");
    const limitMB = isZip && isZipSupported ? 100 : maxFileSize;
    if (selected.size > limitMB * 1024 * 1024) {
      toast.error("File too large", {
        description: `File exceeds size limit of ${limitMB}MB.`,
      });
      return;
    }

    const preview = await createFilePreview(selected);
    setFile({ file: selected, preview });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      void handleSelectedFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      void handleSelectedFile(selectedFiles[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!entityId || entityId.trim() === "") {
      toast.error("Upload failed", {
        description:
          "Entity ID is missing. Please refresh the page and try again.",
      });
      return;
    }

    try {
      const fileData = await readFileAsDataURL(file.file);
      const isZip =
        file.file.name.toLowerCase().endsWith(".zip") && isZipSupported;

      if (isZip) {
        uploadZip({
          entityType: entityType as "COMPANY" | "DEAL_OPPORTUNITY",
          entityId,
          fileData,
          fileName: file.file.name,
        });
      } else {
        uploadFile({
          entityType,
          entityId,
          fileData,
          fileName: file.file.name,
          fileType: file.file.type || "application/octet-stream",
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error
            ? error.message
            : "The file could not be uploaded. Please try again.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <div
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground hover:bg-muted/30",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-foreground mb-1 text-sm">
              Drop a file or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              Max size {maxFileSize}MB
              {isZipSupported && " (100MB for zip)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {file && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">1 file selected</span>
                {!isPending && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="h-8 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {(() => {
                  const Icon = getFileIcon(file.file.type);
                  return (
                    <div className="border-border bg-card hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors">
                      {file.preview ? (
                        <img
                          src={file.preview || "/placeholder.svg"}
                          alt={file.file.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                          <FilesIcon className="text-muted-foreground h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{file.file.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {!isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFile(null)}
                            className="hover:bg-destructive/10 h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isPending && (
                          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isPending}>
            {isPending ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading
              </>
            ) : (
              <>Upload</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
