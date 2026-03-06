"use client";

import type { Company } from "db";
import type { CompanyNote } from "db/schema";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AddCompanyNoteDialog } from "@/components/Dialogs/add-company-note-dialog";

interface CompanyNotesProps {
  company: Company;
}

export function CompanyNotes({ company }: CompanyNotesProps) {
  const trpc = useTRPC();

  const notesQuery = useQuery(
    trpc.companyNotes.listByCompany.queryOptions({
      companyId: company.id,
    }),
  );

  const { mutate: deleteNote, isPending: isDeleting } = useMutation(
    trpc.companyNotes.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Note deleted");
        void notesQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete note");
      },
    }),
  );

  const handleDeleted = (note: CompanyNote) => {
    deleteNote({ id: note.id });
  };

  const handleSaved = () => {
    void notesQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Notes</h2>
          <p className="text-xs text-muted-foreground">
            Capture coverage context, conversations, and ongoing insights for this company.
          </p>
        </div>
        <AddCompanyNoteDialog
          companyId={company.id}
          onSaved={handleSaved}
          triggerLabel="Add note"
          variant="outline"
        />
      </div>

      {notesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !notesQuery.data || notesQuery.data.length === 0 ? (
        <Card className="border-dashed p-4 text-center text-sm text-muted-foreground">
          <p>No notes yet.</p>
          <p className="mt-1">
            Use <span className="font-medium">Add note</span> to create your first note for this
            company.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notesQuery.data.map((note) => (
            <Card key={note.id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {note.title && (
                    <h3 className="text-sm font-semibold text-foreground">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {note.createdAt
                      ? `Created ${new Date(note.createdAt).toLocaleString()}`
                      : "Created"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AddCompanyNoteDialog
                    companyId={company.id}
                    note={note}
                    onSaved={handleSaved}
                    triggerLabel="Edit"
                    variant="ghost"
                    size="sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleted(note)}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


