import type React from "react";

import { useState, useRef, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/navigation-shim";

const GLOBAL_CATEGORIES = [
  {
    value: "CIM",
    label: "CIM (Confidential Information Memorandum)",
  },
  { value: "OPERATING_PLAYBOOK", label: "Operating playbook" },
  { value: "INVESTMENT_MEMO", label: "Investment memo" },
  { value: "IC_TEMPLATE", label: "IC template" },
  { value: "INDUSTRY_RESEARCH", label: "Industry research" },
  { value: "VALUE_CREATION_PLAYBOOK", label: "Value creation playbook" },
  { value: "PAST_DEAL_ANALYSIS", label: "Past deal analysis" },
  { value: "DUE_DILIGENCE_CHECKLIST", label: "Due diligence checklist" },
] as const;

interface UploadFile {
  file: File;
  preview?: string;
}

interface GlobalDocumentUploadDialogProps {
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

export function GlobalDocumentUploadDialog({
  acceptedTypes = ["*/*"],
  maxFileSize = 50,
}: GlobalDocumentUploadDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<UploadFile | null>(null);
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();

  const fileAccept = useMemo(
    () => (category === "CIM" ? ["application/pdf", ".pdf"] : acceptedTypes),
    [category, acceptedTypes],
  );

  useEffect(() => {
    if (category !== "CIM" || !file) return;
    if (!file.file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("CIM must be a PDF", {
        description: "Choose another file or change category.",
      });
      setFile(null);
    }
  }, [category, file]);

  const { mutate: uploadGlobalDocument, isPending } = useMutation(
    trpc.files.uploadGlobalDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Firm document uploaded successfully", {
          description: "The file has been added to the firm library.",
        });
        setFile(null);
        setCategory("");
        setTitle("");
        setDescription("");
        setIsOpen(false);
        void router.invalidate();
      },
      onError: (error) => {
        console.error("Upload failed:", error);
        const isDuplicate =
          error?.data?.code === "CONFLICT" ||
          error.message.toLowerCase().includes("already uploaded");
        if (isDuplicate) {
          toast.warning("Document already uploaded", {
            description:
              "This file is already in your firm library. Use the existing document instead.",
          });
          return;
        }
        toast.error("Upload failed", {
          description:
            error.message ||
            "The file could not be uploaded. Please try again.",
        });
      },
    }),
  );

  const handleSelectedFile = async (selected: File) => {
    if (selected.size > maxFileSize * 1024 * 1024) {
      toast.error("File too large", {
        description: `File exceeds size limit of ${maxFileSize}MB.`,
      });
      return;
    }

    if (category === "CIM" && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("CIM must be a PDF file");
      return;
    }

    const preview = await createFilePreview(selected);
    setFile({ file: selected, preview });
    setTitle((prev) => prev || selected.name.replace(/\.[^/.]+$/, ""));
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

    if (!category) {
      toast.error("Category required", {
        description: "Please select a category for this firm document.",
      });
      return;
    }

    if (!title.trim()) {
      toast.error("Title required", {
        description: "Please enter a title for this document.",
      });
      return;
    }

    try {
      const fileData = await readFileAsDataURL(file.file);

      uploadGlobalDocument({
        category: category as (typeof GLOBAL_CATEGORIES)[number]["value"],
        title: title.trim(),
        description: description.trim() || undefined,
        fileData,
        fileName: file.file.name,
        fileType:
          category === "CIM"
            ? "application/pdf"
            : file.file.type || "application/octet-stream",
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          Upload
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload firm document</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the document"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {GLOBAL_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              {category === "CIM"
                ? `PDF only · max ${maxFileSize}MB`
                : `Max size ${maxFileSize}MB`}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={fileAccept.join(",")}
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
                    onClick={() => {
                      setFile(null);
                      setTitle("");
                    }}
                    className="h-8 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {(() => {
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
                            onClick={() => {
                              setFile(null);
                              setTitle("");
                            }}
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
          <Button
            onClick={handleUpload}
            disabled={!file || !category || !title.trim() || isPending}
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
