"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Download } from "lucide-react";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import DeleteFileDialog from "@/components/Dialogs/delete-file-dialog";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Document } from "db/schema";

interface CompanyFilesListProps {
  files: Document[];
  companyId: string;
  fileCount: number;
}

const CompanyFilesList: React.FC<CompanyFilesListProps> = ({
  files,
  companyId,
  fileCount,
}) => {
  const trpc = useTRPC();
  const router = useRouter();

  const { mutate: deleteFile, isPending: isDeleting } = useMutation(
    trpc.files.delete.mutationOptions({
      onSuccess: () => {
        toast.success("File deleted successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete file");
      },
    }),
  );

  const handleView = (fileUrl: string) => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (fileId: string) => {
    deleteFile({ fileId, companyId });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Files ({fileCount})
        </h2>
        <BulkFileUploadDialog companyId={companyId} />
      </div>
      <div className="border border-border">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No files uploaded yet
            </p>
            <BulkFileUploadDialog companyId={companyId} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.title}</p>
                    {file.category && (
                      <p className="text-xs text-muted-foreground">
                        {file.category}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownload(file.fileUrl, file.fileName || file.title)
                    }
                    className="h-8"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden">Download</span>
                  </Button>
                  <DeleteFileDialog
                    fileName={file.title}
                    onDelete={() => handleDelete(file.id)}
                    isDeleting={isDeleting}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CompanyFilesList;
