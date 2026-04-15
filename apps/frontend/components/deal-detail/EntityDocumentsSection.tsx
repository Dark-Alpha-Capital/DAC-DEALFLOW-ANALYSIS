import * as React from "react";
import type { Document } from "@repo/db/schema";
import { FileUploadDialog } from "@/components/Dialogs/file-upload-dialog";
import { UploadCIMDialog } from "@/components/Dialogs/upload-cim-dialog";
import { DeleteDocumentAlertDialog } from "@/components/documents/delete-document-alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFileSize } from "@/lib/utils";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

type EntityType = "COMPANY" | "DEAL_OPPORTUNITY";

interface EntityDocumentsSectionProps {
  title: string;
  entityType: EntityType;
  entityId: string;
  documents: Document[];
  emptyMessage?: string;
  cimUploadProps?: { dealOpportunityId: string; entityName: string };
}

function ingestionBadge(status: Document["ingestionStatus"]) {
  const label = status.replace(/_/g, " ");
  switch (status) {
    case "PROCESSED":
      return <Badge variant="secondary">{label}</Badge>;
    case "PROCESSING":
    case "PENDING":
      return <Badge variant="outline">{label}</Badge>;
    case "FAILED":
      return <Badge variant="destructive">{label}</Badge>;
    case "SKIPPED":
      return <Badge variant="outline">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export function EntityDocumentsSection({
  title,
  entityType,
  entityId,
  documents,
  emptyMessage = "No documents available.",
  cimUploadProps,
}: EntityDocumentsSectionProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<Document | null>(null);

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          {cimUploadProps && (
            <UploadCIMDialog
              dealOpportunityId={cimUploadProps.dealOpportunityId}
              entityName={cimUploadProps.entityName}
            />
          )}
          <FileUploadDialog entityType={entityType} entityId={entityId} />
        </div>
      </div>
      {documents.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Title</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">File</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Size
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  Ingestion
                </TableHead>
                <TableHead className="w-[1%] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="align-top font-medium">
                    <div className="max-w-[220px] space-y-1">
                      <span className="line-clamp-2">{doc.title}</span>
                      {doc.description && (
                        <span className="text-muted-foreground line-clamp-2 block text-xs font-normal">
                          {doc.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden align-top sm:table-cell">
                    <span className="text-muted-foreground text-xs capitalize">
                      {doc.category.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="hidden align-top md:table-cell">
                    <div className="max-w-[180px] space-y-0.5 text-xs">
                      <span className="text-foreground block truncate">
                        {doc.fileName}
                      </span>
                      {doc.mimeType && (
                        <span className="text-muted-foreground block truncate">
                          {doc.mimeType}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right align-top text-xs lg:table-cell">
                    {doc.fileSize != null ? formatFileSize(doc.fileSize) : "—"}
                  </TableCell>
                  <TableCell className="hidden align-top xl:table-cell">
                    {ingestionBadge(doc.ingestionStatus)}
                  </TableCell>
                  <TableCell className="text-end align-top">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            type="button"
                            aria-label="Document actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                doc.fileUrl,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const a = window.document.createElement("a");
                              a.href = doc.fileUrl;
                              a.download = doc.fileName;
                              window.document.body.appendChild(a);
                              a.click();
                              window.document.body.removeChild(a);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-foreground text-sm font-medium">{emptyMessage}</p>
        </div>
      )}

      {deleteTarget && (
        <DeleteDocumentAlertDialog
          doc={deleteTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          scopeEntityType={entityType}
          scopeEntityId={entityId}
        />
      )}
    </div>
  );
}
