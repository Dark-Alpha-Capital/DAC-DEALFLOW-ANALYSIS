import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  maxTags,
  className,
  disabled = false,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const atLimit = maxTags != null && value.length >= maxTags;

  function addTag(raw: string) {
    const next = raw.trim();
    if (!next || disabled || atLimit) return;
    const exists = value.some(
      (tag) => tag.toLowerCase() === next.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  }

  function removeTag(index: number) {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "border-input bg-background focus-within:ring-ring flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 focus-within:ring-1",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {value.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className="h-7 gap-1 rounded-md px-2"
        >
          <span className="max-w-[12rem] truncate">{tag}</span>
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="hover:text-foreground text-muted-foreground"
              onClick={() => removeTag(index)}
            >
              <X className="size-3" />
            </button>
          ) : null}
        </Badge>
      ))}
      <Input
        value={draft}
        disabled={disabled || atLimit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={
          atLimit
            ? `Maximum ${maxTags} reached`
            : value.length === 0
              ? placeholder
              : "Add another…"
        }
        className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
