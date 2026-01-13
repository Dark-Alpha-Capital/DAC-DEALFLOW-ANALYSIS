"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Deal } from "db/schema";
import { useJobProgress } from "@/hooks/use-job-progress";

interface ConvertDealToCompanyDialogProps {
  deal: Deal;
  dealId: string;
}

const ConvertDealToCompanyDialog: React.FC<ConvertDealToCompanyDialogProps> = ({
  deal,
  dealId,
}) => {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const trpc = useTRPC();
  const router = useRouter();

  // Track job progress
  const {
    progress,
    isComplete,
    isFailed,
    isProcessing,
    step,
    percentage,
    error: jobError,
  } = useJobProgress(jobId, {
    onComplete: (result: any) => {
      // Extract companyId from job result
      const companyId = result?.companyId;
      if (companyId) {
        toast.success("Deal successfully converted to company!");
        setOpen(false);
        router.push(`/companies/${companyId}`);
      } else {
        toast.error("Conversion completed but company ID not found");
      }
    },
    onFailed: (error: string) => {
      toast.error(error || "Conversion failed. Please try again.");
    },
  });

  const { mutate: convertToCompany, isPending: isQueuing } = useMutation(
    trpc.deals.convertToCompany.mutationOptions({
      onSuccess: (data) => {
        // Job has been queued - start tracking progress
        if (data.jobId) {
          setJobId(data.jobId);
          toast.success("Conversion started! Processing in background...");
        }
      },
      onError: (error) => {
        console.error("Error queuing conversion job:", error);
        toast.error(
          error.message || "Failed to start conversion. Please try again.",
        );
      },
    }),
  );

  const handleConvert = () => {
    convertToCompany({ dealId });
  };

  // Reset jobId when dialog closes
  useEffect(() => {
    if (!open) {
      setJobId(null);
    }
  }, [open]);

  const isProcessingOrQueuing =
    isQueuing ||
    Boolean(isProcessing) ||
    Boolean(jobId && !isComplete && !isFailed);

  const dealName = deal.title
    ? `${deal.title} - ${deal.dealCaption}`
    : deal.dealCaption;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="bg-primary font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
          disabled={isProcessingOrQueuing}
        >
          <Building2 className="mr-2 h-5 w-5" />
          {isProcessingOrQueuing ? "Processing..." : "Convert to Company"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle className="text-2xl">
              Convert Deal to Company
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2 text-base">
            <p>
              You are about to convert <strong>{dealName}</strong> from a raw
              deal to a company. This is a <strong>major action</strong> that
              cannot be undone.
            </p>

            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                What will happen:
              </p>
              <ul className="list-disc space-y-2 pl-5 text-amber-800 dark:text-amber-200">
                <li>
                  <strong>Deal will be permanently deleted</strong> - The
                  original deal record will be removed from the system
                </li>
                <li>
                  <strong>Company will be created</strong> - A new company
                  record will be created with mapped data from the deal
                </li>
                <li>
                  <strong>Documents will be moved</strong> - All documents will
                  be updated to belong to the company (entityType changed from
                  DEAL to COMPANY)
                </li>
                <li>
                  <strong>POCs will be migrated</strong> - All Points of Contact
                  will be moved from the deal to the company
                </li>
                <li>
                  <strong>Files will be moved in Nextcloud</strong> - Files will
                  be moved from <code>dealflow/raw-deals/{dealId}/</code> to{" "}
                  <code>Diligence/[companyId]/</code> and the old location will
                  be deleted
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
              <p className="font-semibold text-red-900 dark:text-red-100">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                Once converted, you cannot revert this deal back. Make sure you
                want to proceed.
              </p>
            </div>

            {/* Job Progress Display */}
            {jobId && (isProcessing || isComplete || isFailed) && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  {isComplete && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                  )}
                  {isFailed && (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                  )}
                  {isProcessing && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-500" />
                  )}
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {isComplete
                      ? "Conversion Complete!"
                      : isFailed
                        ? "Conversion Failed"
                        : "Processing in Background..."}
                  </p>
                </div>

                {isProcessing && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-800 dark:text-blue-200">
                          {step || "Initializing..."}
                        </span>
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          {percentage}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </>
                )}

                {isFailed && jobError && (
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {jobError}
                  </p>
                )}

                {isComplete && (
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Redirecting to company page...
                  </p>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessingOrQueuing}>
            {isComplete ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!isComplete && !isFailed && (
            <AlertDialogAction
              onClick={handleConvert}
              disabled={isProcessingOrQueuing}
              className="min-w-[140px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isQueuing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queuing...
                </>
              ) : (
                "Convert to Company"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConvertDealToCompanyDialog;
