import type { Dispatch, SetStateAction } from "react";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  invalidFieldClass,
  REVIEW_FIELD_SECTIONS,
  type ReviewDraft,
  type ReviewFieldConfig,
} from "./project-kickoff-draft-utils";

type ReviewDraftFieldsProps = {
  draft: ReviewDraft;
  setDraft: Dispatch<SetStateAction<ReviewDraft | null>>;
  highlightInvalid: boolean;
};

function isFieldInvalid(
  draft: ReviewDraft,
  field: ReviewFieldConfig,
): boolean {
  if (!field.required) return false;
  const value = draft[field.key];
  return typeof value === "string" && !value.trim();
}

function DraftFieldControl({
  field,
  draft,
  setDraft,
  highlightInvalid,
}: {
  field: ReviewFieldConfig;
  draft: ReviewDraft;
  setDraft: Dispatch<SetStateAction<ReviewDraft | null>>;
  highlightInvalid: boolean;
}) {
  const invalid = isFieldInvalid(draft, field);
  const fieldClass = cn(
    field.mono && "font-mono text-xs sm:text-sm",
    invalidFieldClass(highlightInvalid, invalid),
  );

  const update = (value: string) => {
    setDraft((current) =>
      current ? { ...current, [field.key]: value } : current,
    );
  };

  if (field.type === "department") {
    return (
      <Select value={draft.department || ""} onValueChange={update}>
        <SelectTrigger className={fieldClass}>
          <SelectValue placeholder="Select department…" />
        </SelectTrigger>
        <SelectContent>
          {DEPARTMENT_VALUES.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        rows={field.rows ?? 4}
        value={draft[field.key]}
        placeholder={field.placeholder}
        onChange={(event) => update(event.target.value)}
        className={cn("text-sm leading-relaxed", fieldClass)}
      />
    );
  }

  return (
    <Input
      value={draft[field.key]}
      placeholder={field.placeholder}
      onChange={(event) => update(event.target.value)}
      className={fieldClass}
    />
  );
}

export function ReviewDraftFields({
  draft,
  setDraft,
  highlightInvalid,
}: ReviewDraftFieldsProps) {
  return (
    <FieldGroup className="gap-8">
      {REVIEW_FIELD_SECTIONS.map((section, sectionIndex) => (
        <FieldSet key={section.title} className="gap-4">
          {sectionIndex > 0 ? <Separator className="mb-2" /> : null}
          <FieldLegend className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            {section.title}
          </FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <Field
                key={field.key}
                className={cn(field.colSpan === 2 && "sm:col-span-2")}
              >
                <FieldLabel>
                  {field.label}
                  {field.required ? (
                    <span className="text-destructive ml-0.5" aria-hidden>
                      *
                    </span>
                  ) : null}
                </FieldLabel>
                <DraftFieldControl
                  field={field}
                  draft={draft}
                  setDraft={setDraft}
                  highlightInvalid={highlightInvalid}
                />
              </Field>
            ))}
          </div>
        </FieldSet>
      ))}
    </FieldGroup>
  );
}
