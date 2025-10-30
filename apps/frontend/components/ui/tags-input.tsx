"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  placeholder?: string;
  maxTags?: number;
  onTagsChange?: (tags: string[]) => void;
  className?: string;
  value: string[];
}

export function TagsInput({
  placeholder = "Add a tag...",
  maxTags = 5,
  onTagsChange,
  className,
  value,
}: TagsInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      const newTags = [...value, trimmedTag];
      onTagsChange?.(newTags);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter((tag) => tag !== tagToRemove);
    onTagsChange?.(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Tags Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-sm">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Input
          type="text"
          placeholder={
            value.length >= maxTags
              ? `Maximum ${maxTags} tags reached`
              : placeholder
          }
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={value.length >= maxTags}
          className={cn(
            "transition-colors",
            value.length >= maxTags && "cursor-not-allowed opacity-50",
          )}
        />
        {value.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs text-muted-foreground">
              {value.length}/{maxTags}
            </span>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        Press Enter to add a tag.{" "}
        {value.length < maxTags
          ? `${maxTags - value.length} tags remaining.`
          : "Tag limit reached."}
      </p>
    </div>
  );
}
