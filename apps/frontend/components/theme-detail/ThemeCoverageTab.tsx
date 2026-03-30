
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { CoverageRowForm } from "./CoverageRowForm";
import type { ThemeDetailTabProps } from "./types";

export function ThemeCoverageTab({
  theme,
  coverage,
  companies,
}: ThemeDetailTabProps) {
  const trpc = useTRPC();
  const router = useRouter();

  const coverageByCompanyId = useMemo(
    () => new Map(coverage.map((item) => [item.companyId, item])),
    [coverage],
  );

  const { mutate: upsertCoverage, isPending: isSavingCoverage } = useMutation(
    trpc.themes.coverageUpsert.mutationOptions({
      onSuccess: () => {
        toast.success("Coverage updated");
        router.refresh();
      },
      onError: (error) =>
        toast.error(error.message || "Failed to update coverage"),
    }),
  );

  if (companies.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No companies linked to this theme yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {companies.map((company) => {
        const covered = coverageByCompanyId.get(company.id);
        const defaultStatus = covered?.coverageStatus ?? "UNCONTACTED";
        const defaultDate = covered?.lastOutreachAt
          ? new Date(covered.lastOutreachAt).toISOString().slice(0, 10)
          : "";
        const defaultNotes = covered?.notes ?? "";

        return (
          <CoverageRowForm
            key={company.id}
            company={company}
            defaultStatus={defaultStatus}
            defaultDate={defaultDate}
            defaultNotes={defaultNotes}
            isSaving={isSavingCoverage}
            onSave={(payload) =>
              upsertCoverage({
                themeId: theme.id,
                companyId: company.id,
                coverageStatus: payload.status,
                lastOutreachAt: payload.lastOutreachAt || undefined,
                notes: payload.notes,
              })
            }
          />
        );
      })}
    </div>
  );
}
