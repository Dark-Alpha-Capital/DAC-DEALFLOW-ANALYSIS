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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilesIcon, Loader2, Upload, X } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-category-options";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { DocumentCategory } from "@repo/db/enums";

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

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("OTHER");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();

  const { mutate: uploadFile, isPending } = useMutation(
    trpc.files.uploadFile.mutationOptions({
      onSuccess: () => {
        toast.success("File uploaded successfully", {
          description: "The file has been uploaded.",
        });
        resetForm();
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

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("OTHER");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleSelectedFile = async (selected: File) => {
    if (selected.name.toLowerCase().endsWith(".zip")) {
      toast.error("Zip uploads are not supported", {
        description: "Please upload a single file.",
      });
      return;
    }
    if (selected.size > maxFileSize * 1024 * 1024) {
      toast.error("File too large", {
        description: `File exceeds size limit of ${maxFileSize}MB.`,
      });
      return;
    }

    const preview = await createFilePreview(selected);
    setFile({ file: selected, preview });
    setTitle(stripExtension(selected.name));
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

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!entityId || entityId.trim() === "") {
      toast.error("Upload failed", {
        description:
          "Entity ID is missing. Please refresh the page and try again.",
      });
      return;
    }

    try {
      const fileData = await readFileAsDataURL(file.file);
      uploadFile({
        entityType,
        entityId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        fileData,
        fileName: file.file.name,
        fileType: file.file.type || "application/octet-stream",
      });
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
              One file at a time, max {maxFileSize}MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-description">Description (optional)</Label>
              <Textarea
                id="upload-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about this file"
                rows={3}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DocumentCategory)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                    Clear file
                  </Button>
                )}
              </div>

              <div className="space-y-2">
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
              </div>
            </div>
          )}
        </div>

        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || isPending}
          >
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
