
import type { Company } from "@repo/db";
import type { CompanyNote } from "@repo/db/schema";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AddCompanyNoteDialog } from "@/components/Dialogs/add-company-note-dialog";

interface CompanyNotesProps {
  company: Company;
  notes: CompanyNote[];
  /** When provided, revalidates deal cache on mutation */
  dealUid?: string;
}

export function CompanyNotes({ company, notes, dealUid }: CompanyNotesProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: deleteNote, isPending: isDeleting } = useMutation(
    trpc.companyNotes.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Note deleted");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete note");
      },
    }),
  );

  const handleDeleted = (note: CompanyNote) => {
    deleteNote({ id: note.id, dealUid });
  };

  const handleSaved = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-medium">Notes</h2>
          <p className="text-muted-foreground text-xs">
            Capture coverage context, conversations, and ongoing insights for
            this company.
          </p>
        </div>
        <AddCompanyNoteDialog
          companyId={company.id}
          onSaved={handleSaved}
          triggerLabel="Add note"
          variant="outline"
          dealUid={dealUid}
        />
      </div>

      {notes.length === 0 ? (
        <Card className="text-muted-foreground border-dashed p-4 text-center text-sm">
          <p>No notes yet.</p>
          <p className="mt-1">
            Use <span className="font-medium">Add note</span> to create your
            first note for this company.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {note.title && (
                    <h3 className="text-foreground text-sm font-semibold">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-muted-foreground text-[11px]">
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
                    dealUid={dealUid}
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
