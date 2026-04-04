import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/navigation-shim";
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/document-category-options";
import type { DocumentCategory } from "@repo/db/enums";

interface UploadCIMDialogProps {
  dealOpportunityId: string;
  entityName: string;
  trigger?: React.ReactNode;
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

export function UploadCIMDialog({
  dealOpportunityId,
  entityName,
  trigger,
}: UploadCIMDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("CIM");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const router = useRouter();
  const user = useCurrentUser();

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("CIM");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const { mutate: uploadCIM, isPending } = useMutation(
    trpc.dealOpportunities.uploadCIM.mutationOptions({
      onSuccess: (data) => {
        if (data.success && data.jobId) {
          window.dispatchEvent(
            new CustomEvent("newJobs", {
              detail: [
                {
                  jobId: data.jobId,
                  fileName: file?.name ?? "CIM.pdf",
                  userId: user?.id ?? "",
                  entityId: dealOpportunityId,
                  queueName: QUEUE_NAMES.CIM_EXTRACTION,
                },
              ],
            }),
          );
        }
        toast.success("CIM uploaded. Extraction running in background.");
        resetForm();
        setIsOpen(false);
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to upload CIM");
      },
    }),
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file");
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setFile(selected);
    setTitle(stripExtension(selected.name));
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const fileData = await readFileAsDataURL(file);
      uploadCIM({
        dealOpportunityId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        fileData,
        fileName: file.name,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Upload CIM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-[425px] flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload CIM</DialogTitle>
          <DialogDescription>
            Upload a Confidential Information Memorandum (PDF) for {entityName}.
            Extraction will run automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cim-file">PDF file</Label>
            <Input
              id="cim-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="cursor-pointer"
              disabled={isPending}
            />
            {file && (
              <p className="text-muted-foreground text-sm">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cim-title">Title</Label>
            <Input
              id="cim-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cim-description">Description (optional)</Label>
            <Textarea
              id="cim-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this CIM"
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
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || !title.trim() || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CIM
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
