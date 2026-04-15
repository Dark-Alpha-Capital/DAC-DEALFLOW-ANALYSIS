import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import type { DocumentRow } from "./columns";
import { EditDocumentDialog } from "./edit-document-dialog";
import { DeleteDocumentAlertDialog } from "./delete-document-alert-dialog";

interface DocumentActionsDropdownProps {
  doc: DocumentRow;
}

export function DocumentActionsDropdown({ doc }: DocumentActionsDropdownProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const handleView = () => {
    window.open(doc.fileUrl, "_blank");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.title ?? doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleView}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDocumentDialog
        doc={doc}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteDocumentAlertDialog
        doc={doc}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
