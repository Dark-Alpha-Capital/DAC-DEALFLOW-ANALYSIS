"use client";

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
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@/lib/queue-types";

interface UploadCIMDialogProps {
  dealOpportunityId: string;
  entityName: string;
  trigger?: React.ReactNode;
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

export function UploadCIMDialog({
  dealOpportunityId,
  entityName,
  trigger,
}: UploadCIMDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const router = useRouter();
  const user = useCurrentUser();

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
        setFile(null);
        setIsOpen(false);
        router.refresh();
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
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const fileData = await readFileAsDataURL(file);
      uploadCIM({
        dealOpportunityId,
        entityName,
        fileData,
        fileName: file.name,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Upload CIM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload CIM</DialogTitle>
          <DialogDescription>
            Upload a Confidential Information Memorandum (PDF) for {entityName}.
            Extraction will run automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-muted-foreground text-sm">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || isPending}
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
