import { FileText } from "lucide-react";

export default function DocumentPage() {
  return (
    <div className="big-container block-space">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Document analysis</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          PDF deal extraction has been removed. Use the deals pipeline or manual
          entry to add deals.
        </p>
      </div>
    </div>
  );
}
