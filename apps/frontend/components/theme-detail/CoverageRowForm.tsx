
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COVERAGE_STATUSES, type ThemeCompany } from "./types";

type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export function CoverageRowForm({
  company,
  defaultStatus,
  defaultDate,
  defaultNotes,
  isSaving,
  onSave,
}: {
  company: ThemeCompany;
  defaultStatus: CoverageStatus;
  defaultDate: string;
  defaultNotes: string;
  isSaving: boolean;
  onSave: (payload: {
    status: CoverageStatus;
    lastOutreachAt: string;
    notes: string;
  }) => void;
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [lastOutreachAt, setLastOutreachAt] = useState(defaultDate);
  const [notes, setNotes] = useState(defaultNotes);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{company.name}</p>
        <p className="text-muted-foreground text-xs">
          {company.industry || "—"}{" "}
          {company.location ? `· ${company.location}` : ""}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as CoverageStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Coverage status" />
          </SelectTrigger>
          <SelectContent>
            {COVERAGE_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={lastOutreachAt}
          onChange={(e) => setLastOutreachAt(e.target.value)}
        />
        <Button
          size="sm"
          disabled={isSaving}
          onClick={() => onSave({ status, lastOutreachAt, notes })}
        >
          Save coverage
        </Button>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Coverage notes"
        className="min-h-[70px]"
      />
    </div>
  );
}
