
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import type { DocumentRow } from "./columns";

const DOCUMENT_CATEGORIES = [
  { value: "FINANCIALS", label: "Financials" },
  { value: "LEGAL", label: "Legal" },
  { value: "TAX", label: "Tax" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ESG", label: "ESG" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "INVESTOR_RELATIONSHIPS", label: "Investor relationships" },
  { value: "TOOLS", label: "Tools" },
  { value: "LEGISLATION", label: "Legislation" },
  { value: "RESEARCH", label: "Research" },
  { value: "PROSPECTUS", label: "Prospectus" },
  { value: "OTHER", label: "Other" },
  { value: "OPERATING_PLAYBOOK", label: "Operating playbook" },
  { value: "INVESTMENT_MEMO", label: "Investment memo" },
  { value: "IC_TEMPLATE", label: "IC template" },
  { value: "INDUSTRY_RESEARCH", label: "Industry research" },
  { value: "VALUE_CREATION_PLAYBOOK", label: "Value creation playbook" },
  { value: "PAST_DEAL_ANALYSIS", label: "Past deal analysis" },
  { value: "DUE_DILIGENCE_CHECKLIST", label: "Due diligence checklist" },
  { value: "SIM_SCREENING", label: "SIM screening" },
] as const;

interface EditDocumentDialogProps {
  doc: DocumentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDocumentDialog({
  doc,
  open,
  onOpenChange,
}: EditDocumentDialogProps) {
  const [title, setTitle] = React.useState(doc.title ?? "");
  const [description, setDescription] = React.useState(
    doc.description ?? ""
  );
  const [category, setCategory] = React.useState(doc.category ?? "OTHER");

  React.useEffect(() => {
    if (open) {
      setTitle(doc.title ?? "");
      setDescription(doc.description ?? "");
      setCategory(doc.category ?? "OTHER");
    }
  }, [open, doc.title, doc.description, doc.category]);

  const trpc = useTRPC();
  const { mutate, isPending } = useMutation(
    trpc.files.updateDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document updated");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to update document");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    mutate({
      documentId: doc.id,
      title: title.trim(),
      description: description.trim() || null,
      category: category as (typeof DOCUMENT_CATEGORIES)[number]["value"],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
