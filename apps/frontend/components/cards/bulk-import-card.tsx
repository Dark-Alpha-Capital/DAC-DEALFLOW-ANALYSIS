
import React from "react";
import { Button } from "../ui/button";
import * as XLSX from "xlsx";
import { BulkImportDialog } from "../Dialogs/bulk-import-dialog";

const BulkImportCard = () => {
  return (
    <div className="h-fit rounded-lg border bg-muted p-6 shadow-lg">
      <h2 className="mb-4 text-center text-xl font-semibold">
        Bulk Import Deals
      </h2>
      <p className="mb-2 text-center text-muted-foreground">
        Quickly import multiple deals at once by uploading a file. Save time and
        effort with bulk import functionality.
      </p>

      <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3">
        <p className="text-center text-sm font-medium text-warning">
          All-or-Nothing Upload: All rows must pass validation before any deals
          are uploaded. Fix all errors to proceed.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Required Format:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Brokerage (Required)</li>
            <li>First Name (Optional)</li>
            <li>Last Name (Optional)</li>
            <li>Work Phone (Optional)</li>
            <li>Email (Optional, must be valid format)</li>
            <li>LinkedIn URL (Optional, must be valid URL)</li>
            <li>Deal Caption (Required)</li>
            <li>Revenue (Required, must be a number)</li>
            <li>EBITDA (Required, must be a number)</li>
            <li>EBITDA Margin (Required, must be a number)</li>
            <li>Industry (Required)</li>
            <li>Source Website (Required, must be valid URL)</li>
            <li>Upload (Required, &quot;Y&quot; or &quot;N&quot;)</li>
            <li>UploadOnCRM (Required, &quot;Yes&quot; or &quot;No&quot;)</li>
            <li>Company Location (Optional)</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Only rows with Upload = &quot;Y&quot; will be uploaded. Rows with
            Upload = &quot;N&quot; will be skipped.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              const headers = [
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
              ];
              const ws = XLSX.utils.aoa_to_sheet([headers]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Template");
              XLSX.writeFile(wb, "deal-import-template.xlsx");
            }}
          >
            Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const headers = [
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
              ];
              const exampleData = [
                headers,
                [
                  "Example Brokerage",
                  "John",
                  "Doe",
                  "1234567890",
                  "john@example.com",
                  "https://linkedin.com/in/johndoe",
                  "Example Deal",
                  "1000000",
                  "200000",
                  "20",
                  "Technology",
                  "https://example.com",
                  "Y",
                  "Yes",
                  "New York",
                ],
              ];
              const ws = XLSX.utils.aoa_to_sheet(exampleData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Example");
              XLSX.writeFile(wb, "deal-import-example.xlsx");
            }}
          >
            Download Example
          </Button>
        </div>
      </div>

      <BulkImportDialog />
    </div>
  );
};

export default BulkImportCard;
