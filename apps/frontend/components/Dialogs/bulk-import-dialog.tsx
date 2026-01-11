"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  File as FileIcon,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { TransformedDeal } from "@/app/types";
import { useToast } from "@/hooks/use-toast";
import BulkUploadDealsToDB from "@/lib/actions/bulk-upload-deal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SheetDeal = {
  Brokerage: string;
  "First Name"?: string;
  "Last Name"?: string;
  "Work Phone"?: string;
  Email?: string;
  "LinkedIn URL"?: string;
  "Deal Caption": string;
  Revenue: number;
  EBITDA: number;
  "EBITDA Margin": number;
  Industry: string;
  "Source Website": string;
  Upload: "Y" | "N";
  UploadOnCRM: "Yes" | "No";
  "Company Location"?: string;
};

type RowValidationError = {
  row: number;
  errors: string[];
};

// Expected headers for the Excel/CSV file
const EXPECTED_HEADERS = [
  "Brokerage",
  "First Name",
  "Last Name",
  "Work Phone",
  "Email",
  "LinkedIn URL",
  "Deal Caption",
  "Revenue",
  "EBITDA",
  "EBITDA Margin",
  "Industry",
  "Source Website",
  "Upload",
  "UploadOnCRM",
  "Company Location",
] as const;

// Validation helper functions
const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidNumber = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

const validateDealRow = (deal: Record<string, unknown>): string[] => {
  const errors: string[] = [];

  // Required string fields
  if (!deal["Brokerage"] || String(deal["Brokerage"]).trim() === "") {
    errors.push("Brokerage is required");
  }

  if (!deal["Deal Caption"] || String(deal["Deal Caption"]).trim() === "") {
    errors.push("Deal Caption is required");
  }

  if (!deal["Industry"] || String(deal["Industry"]).trim() === "") {
    errors.push("Industry is required");
  }

  if (!deal["Source Website"] || String(deal["Source Website"]).trim() === "") {
    errors.push("Source Website is required");
  } else if (!isValidUrl(String(deal["Source Website"]))) {
    errors.push("Source Website must be a valid URL");
  }

  // Required numeric fields
  if (!isValidNumber(deal["Revenue"])) {
    errors.push("Revenue is required and must be a valid number");
  }

  if (!isValidNumber(deal["EBITDA"])) {
    errors.push("EBITDA is required and must be a valid number");
  }

  if (!isValidNumber(deal["EBITDA Margin"])) {
    errors.push("EBITDA Margin is required and must be a valid number");
  }

  // Upload field validation
  const uploadValue = String(deal["Upload"] || "").toUpperCase();
  if (!uploadValue || (uploadValue !== "Y" && uploadValue !== "N")) {
    errors.push('Upload must be "Y" or "N"');
  }

  // UploadOnCRM field validation
  const uploadOnCRMValue = String(deal["UploadOnCRM"] || "").toLowerCase();
  if (
    !uploadOnCRMValue ||
    (uploadOnCRMValue !== "yes" && uploadOnCRMValue !== "no")
  ) {
    errors.push('UploadOnCRM must be "Yes" or "No"');
  }

  // Optional field validations
  if (deal["Email"] && !isValidEmail(String(deal["Email"]))) {
    errors.push("Email must be a valid email address");
  }

  if (deal["LinkedIn URL"] && !isValidUrl(String(deal["LinkedIn URL"]))) {
    errors.push("LinkedIn URL must be a valid URL");
  }

  return errors;
};

export function BulkImportDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deals, setDeals] = useState<SheetDeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<RowValidationError[]>(
    []
  );
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Compute if there are any validation errors
  const hasValidationErrors = useMemo(
    () => validationErrors.length > 0,
    [validationErrors]
  );

  // Get count of deals that will be uploaded (only those with Upload = "Y")
  const dealsToUpload = useMemo(
    () =>
      deals.filter(
        (deal) => String(deal["Upload"]).toUpperCase() === "Y"
      ),
    [deals]
  );

  const parseFile = useCallback((uploadedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName || ""];

      const rows = XLSX.utils.sheet_to_json<string[]>(
        worksheet as unknown as XLSX.WorkSheet,
        {
          header: 1,
        }
      );
      const headerRow = (rows[0] || []) as string[];

      const missing = EXPECTED_HEADERS.filter(
        (h) => !headerRow.includes(h)
      );
      const extra = headerRow.filter(
        (h) => !EXPECTED_HEADERS.includes(h as (typeof EXPECTED_HEADERS)[number])
      );
      if (missing.length > 0 || extra.length > 0) {
        const msgs: string[] = [];
        if (missing.length)
          msgs.push(`Missing columns: ${missing.join(", ")}`);
        if (extra.length) msgs.push(`Unexpected columns: ${extra.join(", ")}`);
        setError(`Invalid file format. ${msgs.join(". ")}`);
        setDeals([]);
        setValidationErrors([]);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(
        worksheet as unknown as XLSX.WorkSheet
      ) as SheetDeal[];

      // Validate each row
      const rowErrors: RowValidationError[] = [];
      jsonData.forEach((deal, index) => {
        const errors = validateDealRow(
          deal as unknown as Record<string, unknown>
        );
        if (errors.length > 0) {
          rowErrors.push({
            row: index + 2, // +2 because row 1 is header, and index is 0-based
            errors,
          });
        }
      });

      setDeals(jsonData);
      setValidationErrors(rowErrors);

      if (rowErrors.length > 0) {
        setError(
          `Validation failed for ${rowErrors.length} row(s). Please fix the errors before uploading.`
        );
        setShowValidationDetails(true);
      } else {
        setError(null);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const droppedFile = acceptedFiles[0];
      if (droppedFile) {
        const validTypes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ];
        if (
          validTypes.includes(droppedFile.type) ||
          droppedFile.name.endsWith(".xlsx") ||
          droppedFile.name.endsWith(".csv")
        ) {
          setFile(droppedFile);
          setError(null);
          setSuccess(null);
          setValidationErrors([]);
          setShowValidationDetails(false);
          parseFile(droppedFile);
        } else {
          setFile(null);
          setDeals([]);
          setValidationErrors([]);
          setError("Please upload a valid Excel (.xlsx) or CSV file.");
        }
      }
    },
    [parseFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const transformDeals = (deals: SheetDeal[]): TransformedDeal[] => {
    return deals.map((deal) => ({
      brokerage: deal["Brokerage"],
      firstName: deal["First Name"],
      lastName: deal["Last Name"],
      linkedinUrl: deal["LinkedIn URL"],
      email: deal.Email,
      workPhone: deal["Work Phone"],
      dealCaption: deal["Deal Caption"],
      revenue: deal.Revenue,
      ebitda: deal.EBITDA,
      ebitdaMargin: deal["EBITDA Margin"],
      industry: deal.Industry,
      sourceWebsite: deal["Source Website"],
      companyLocation: deal["Company Location"],
    }));
  };

  const handleUpload = async () => {
    if (!file || deals.length === 0) return;

    // Block upload if there are validation errors
    if (hasValidationErrors) {
      toast({
        title: "Cannot upload",
        variant: "destructive",
        description:
          "Please fix all validation errors before uploading. No deals will be uploaded until all errors are resolved.",
      });
      return;
    }

    // Filter only deals marked for upload
    const dealsMarkedForUpload = deals.filter(
      (deal) => String(deal["Upload"]).toUpperCase() === "Y"
    );

    if (dealsMarkedForUpload.length === 0) {
      toast({
        title: "No deals to upload",
        variant: "destructive",
        description:
          'No deals are marked for upload. Set the "Upload" column to "Y" for deals you want to upload.',
      });
      return;
    }

    setUploading(true);
    setSuccess(null);
    setError(null);

    const formattedDeals = transformDeals(dealsMarkedForUpload);
    console.log("formattedDeals", formattedDeals);
    const response = await BulkUploadDealsToDB(formattedDeals);

    if (response.error) {
      setError(response.error);
      toast({
        title: "Error uploading deals",
        variant: "destructive",
        description: response.error,
      });
    } else {
      setSuccess(
        `${dealsMarkedForUpload.length} deal(s) uploaded successfully`
      );
      setDeals([]);
      setFile(null);
      setValidationErrors([]);
      toast({
        title: "Success",
        description: `${dealsMarkedForUpload.length} deal(s) uploaded successfully`,
      });
    }

    setUploading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import Deals
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[90vw] sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Bulk Import Deals</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[250px] w-full sm:h-[350px] md:h-[400px] lg:h-[450px]">
            <div className="grid gap-4 py-4">
              <div
                {...getRootProps()}
                className={cn(
                  "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center",
                  isDragActive ? "border-primary" : "border-muted-foreground",
                )}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center">
                    <FileIcon className="mr-2 h-6 w-6" />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <p>
                    Drag & drop an Excel or CSV file here, or click to select
                    one
                  </p>
                )}
              </div>
              {success && (
                <div className="flex items-start text-success">
                  <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0 break-words">{success}</span>
                </div>
              )}
              {error && (
                <div className="flex items-start text-destructive">
                  <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0 break-words">{error}</span>
                </div>
              )}

              {/* Validation Errors Display */}
              {validationErrors.length > 0 && (
                <Collapsible
                  open={showValidationDetails}
                  onOpenChange={setShowValidationDetails}
                  className="rounded-lg border border-destructive/50 bg-destructive/5"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex w-full items-center justify-between p-4 hover:bg-destructive/10"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="font-medium text-destructive">
                          {validationErrors.length} row(s) with validation errors
                        </span>
                      </div>
                      {showValidationDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="max-h-[200px] space-y-3 overflow-y-auto p-4 pt-0">
                      {validationErrors.map((rowError) => (
                        <div
                          key={rowError.row}
                          className="rounded-md border border-destructive/30 bg-background p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive">
                              Row {rowError.row}
                            </span>
                          </div>
                          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {rowError.errors.map((err, idx) => (
                              <li key={idx} className="text-destructive/80">
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="border-t p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> All errors must be fixed in your
                        file before uploading. No deals will be uploaded until
                        all validation errors are resolved.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Deal Summary */}
              {deals.length > 0 && !hasValidationErrors && (
                <div className="rounded-lg border border-success/50 bg-success/5 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-medium text-success">
                      Validation Passed
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Total rows in file: {deals.length}</p>
                    <p>Deals marked for upload: {dealsToUpload.length}</p>
                    <p>
                      Deals skipped (Upload = &quot;N&quot;):{" "}
                      {deals.length - dealsToUpload.length}
                    </p>
                  </div>
                </div>
              )}
              {deals.length > 0 && hasValidationErrors && (
                <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <span className="font-medium text-warning">
                      Fix Errors to Continue
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Total rows in file: {deals.length}</p>
                    <p className="text-destructive">
                      Rows with errors: {validationErrors.length}
                    </p>
                    <p>
                      Valid rows:{" "}
                      {deals.length - validationErrors.length}
                    </p>
                  </div>
                </div>
              )}
              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </ScrollArea>
          <Button
            onClick={handleUpload}
            disabled={
              !file ||
              deals.length === 0 ||
              uploading ||
              hasValidationErrors ||
              dealsToUpload.length === 0
            }
            className={cn(
              hasValidationErrors &&
                "cursor-not-allowed bg-destructive/50 hover:bg-destructive/50"
            )}
          >
            {uploading
              ? "Uploading..."
              : hasValidationErrors
                ? `Fix ${validationErrors.length} Error(s) to Upload`
                : dealsToUpload.length === 0
                  ? "No Deals Marked for Upload"
                  : `Upload ${dealsToUpload.length} Deal(s)`}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
