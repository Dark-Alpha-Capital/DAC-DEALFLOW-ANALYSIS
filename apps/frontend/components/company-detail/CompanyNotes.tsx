"use client";

import type { Company } from "db";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface CompanyNotesProps {
  company: Company;
}

export function CompanyNotes({ company }: CompanyNotesProps) {
  const trpc = useTRPC();
  const [value, setValue] = useState(company.notes ?? "");

  const { mutate: saveNotes, isPending } = useMutation(
    trpc.companies.updateNotes.mutationOptions({
      onSuccess: () => {
        toast.success("Notes saved");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save notes");
      },
    }),
  );

  return (
    <div className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium">Notes</h2>
      <Textarea
        rows={4}
        placeholder="Add notes about coverage, conversations, and context..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => saveNotes({ id: company.id, notes: value.trim() || undefined })}
          disabled={isPending}
        >
          Save notes
        </Button>
      </div>
    </div>
  );
}

