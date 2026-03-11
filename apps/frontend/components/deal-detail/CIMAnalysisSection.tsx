"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Pencil,
  Save,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCIMDialog } from "@/components/Dialogs/upload-cim-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface CIMAnalysisSectionProps {
  dealOpportunityId: string;
  entityName?: string;
}

const hasAnyFinancials = (data: {
  revenueHistory?: Record<string, number>;
  ebitdaHistory?: Record<string, number>;
  employeeCount?: number | null;
  customerConcentration?: number | null;
  growthDrivers?: string[];
  keyRisks?: string[];
}) =>
  (Object.keys(data.revenueHistory ?? {}).length > 0 ||
    Object.keys(data.ebitdaHistory ?? {}).length > 0 ||
    data.employeeCount != null ||
    data.customerConcentration != null ||
    (data.growthDrivers?.length ?? 0) > 0 ||
    (data.keyRisks?.length ?? 0) > 0);

export function CIMAnalysisSection({
  dealOpportunityId,
  entityName = "Deal",
}: CIMAnalysisSectionProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading } = useQuery(
    trpc.dealOpportunities.getCIMAnalysisForOpportunity.queryOptions({ dealOpportunityId }),
  );

  const { mutate: editFinancials, isPending: isSaving } = useMutation(
    trpc.dealOpportunities.editFinancials.mutationOptions({
      onSuccess: () => {
        toast.success("Financials updated");
        setIsEditing(false);
        queryClient.invalidateQueries({
          queryKey: trpc.dealOpportunities.getCIMAnalysisForOpportunity.queryKey({
            dealOpportunityId,
          }),
        });
      },
      onError: (e) => toast.error(e.message ?? "Failed to save"),
    }),
  );

  const { mutate: deleteFinancials, isPending: isDeleting } = useMutation(
    trpc.dealOpportunities.deleteFinancials.mutationOptions({
      onSuccess: () => {
        toast.success("Financials deleted");
        setShowDeleteConfirm(false);
        queryClient.invalidateQueries({
          queryKey: trpc.dealOpportunities.getCIMAnalysisForOpportunity.queryKey({
            dealOpportunityId,
          }),
        });
      },
      onError: (e) => toast.error(e.message ?? "Failed to delete"),
    }),
  );

  const startEdit = () => {
    setEditForm({
      employeeCount: data?.employeeCount ?? null,
      customerConcentration: data?.customerConcentration ?? null,
      capexIntensity: data?.capexIntensity ?? "",
      industryOverview: data?.industryOverview ?? "",
      transactionDetails: data?.transactionDetails ?? "",
      growthDrivers: (data?.growthDrivers ?? []).join("\n"),
      keyRisks: (data?.keyRisks ?? []).join("\n"),
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    const growthDrivers = (editForm.growthDrivers as string)
      ?.split("\n")
      .filter(Boolean);
    const keyRisks = (editForm.keyRisks as string)
      ?.split("\n")
      .filter(Boolean);
    editFinancials({
      dealOpportunityId,
      employeeCount:
        editForm.employeeCount === "" || editForm.employeeCount == null
          ? null
          : Number(editForm.employeeCount),
      customerConcentration:
        editForm.customerConcentration === "" ||
        editForm.customerConcentration == null
          ? null
          : Number(editForm.customerConcentration),
      capexIntensity:
        (editForm.capexIntensity as string) || null,
      industryOverview:
        (editForm.industryOverview as string) || null,
      transactionDetails:
        (editForm.transactionDetails as string) || null,
      growthDrivers: growthDrivers?.length ? growthDrivers : null,
      keyRisks: keyRisks?.length ? keyRisks : null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          CIM Analysis
        </h2>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeSim = data?.activeSim;
  const isProcessing = activeSim?.status === "processing";
  const hasFinancials = data && hasAnyFinancials(data);

  if (!data || (!activeSim && !hasFinancials)) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          CIM Analysis
        </h2>
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground text-sm">
            No CIM uploaded yet. Upload a CIM to run analysis automatically.
          </p>
          <UploadCIMDialog
            dealOpportunityId={dealOpportunityId}
            entityName={entityName}
          />
        </div>
      </div>
    );
  }

  if (activeSim && isProcessing) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          CIM Analysis
        </h2>
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-muted-foreground text-sm">
            CIM uploaded. Extraction running in background.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Only the latest SIM is used. Uploading a new SIM replaces the
            current one.
          </p>
          <div className="mt-3">
            <UploadCIMDialog
              dealOpportunityId={dealOpportunityId}
              entityName={entityName}
              trigger={
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Replace CIM
                </Button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeSim && !hasFinancials) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          CIM Analysis
        </h2>
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-muted-foreground text-sm">
            No financials available for this SIM yet.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Only the latest SIM is used. Uploading a new SIM replaces the
            current one.
          </p>
          <div className="mt-3">
            <UploadCIMDialog
              dealOpportunityId={dealOpportunityId}
              entityName={entityName}
              trigger={
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Replace CIM
                </Button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const revenueEntries = Object.entries(data.revenueHistory ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const ebitdaEntries = Object.entries(data.ebitdaHistory ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const breakdownEntries = Object.entries(data.revenueBreakdown ?? {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          CIM Analysis
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            Only the latest SIM is used. Uploading a new SIM replaces the
            current one.
          </p>
          <UploadCIMDialog
            dealOpportunityId={dealOpportunityId}
            entityName={entityName}
            trigger={
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Replace CIM
              </Button>
            }
          />
          {hasFinancials && (
            <>
              {isEditing ? (
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete financials
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete financials?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all extracted financials for this SIM. The SIM
              file remains stored, but you will lose the numbers until you
              re-extract or edit them again. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteFinancials({ dealOpportunityId })
              }
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditing ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground text-xs">
                Employee count
              </label>
              <Input
                type="number"
                value={String(editForm.employeeCount ?? "")}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    employeeCount: e.target.value || null,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs">
                Customer concentration (%)
              </label>
              <Input
                type="number"
                value={String(editForm.customerConcentration ?? "")}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    customerConcentration: e.target.value || null,
                  }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-xs">
              Capex intensity
            </label>
            <Input
              value={(editForm.capexIntensity as string) ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, capexIntensity: e.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs">
              Growth drivers (one per line)
            </label>
            <textarea
              className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              value={(editForm.growthDrivers as string) ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, growthDrivers: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs">
              Key risks (one per line)
            </label>
            <textarea
              className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              value={(editForm.keyRisks as string) ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, keyRisks: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs">
              Industry overview
            </label>
            <textarea
              className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              value={(editForm.industryOverview as string) ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, industryOverview: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs">
              Transaction details
            </label>
            <textarea
              className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              value={(editForm.transactionDetails as string) ?? ""}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  transactionDetails: e.target.value,
                }))
              }
            />
          </div>
        </div>
      ) : (
        <>
          {revenueEntries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                Revenue History
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {revenueEntries.map(([year, val]) => (
                  <div
                    key={year}
                    className="flex justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-muted-foreground text-sm">
                      {year}
                    </span>
                    <span className="tabular-nums text-sm font-medium">
                      {formatCurrency(Number(val) * 1e6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ebitdaEntries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                EBITDA History
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ebitdaEntries.map(([year, val]) => (
                  <div
                    key={year}
                    className="flex justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-muted-foreground text-sm">
                      {year}
                    </span>
                    <span className="tabular-nums text-sm font-medium">
                      {formatCurrency(Number(val) * 1e6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.customerConcentration != null ||
            data.employeeCount != null ||
            data.capexIntensity) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.customerConcentration != null && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Customer Concentration
                  </p>
                  <p className="tabular-nums text-sm font-medium">
                    Top customer:{" "}
                    {formatPercent(data.customerConcentration / 100)}
                  </p>
                </div>
              )}
              {data.employeeCount != null && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Employees
                  </p>
                  <p className="tabular-nums text-sm font-medium">
                    {data.employeeCount}
                  </p>
                </div>
              )}
              {data.capexIntensity && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Capex
                  </p>
                  <p className="tabular-nums text-sm font-medium">
                    {data.capexIntensity}
                  </p>
                </div>
              )}
            </div>
          )}

          {breakdownEntries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                Revenue Breakdown
              </h3>
              <div className="space-y-1">
                {breakdownEntries.map(([segment, pct]) => (
                  <div
                    key={segment}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{segment}</span>
                    <span className="tabular-nums font-medium">
                      {formatPercent((pct as number) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.growthDrivers?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                <TrendingUp className="h-3 w-3" />
                Growth Drivers
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {data.growthDrivers!.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {(data.keyRisks?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                Key Risks
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {data.keyRisks!.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {data.industryOverview && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                Industry Overview
              </h3>
              <p className="text-sm leading-relaxed">
                {data.industryOverview}
              </p>
            </div>
          )}

          {data.transactionDetails && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium">
                Transaction Details
              </h3>
              <p className="text-sm leading-relaxed">
                {data.transactionDetails}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
