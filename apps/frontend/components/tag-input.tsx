"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Props for the TagInput component
export interface TagInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tags: string[]; // Current list of tags
  setTags: (tags: string[]) => void; // Function to update tags
  maxTags?: number; // Optional max number of tags
  onTagAdd?: (tag: string) => void; // Optional callback when a tag is added
  onTagRemove?: (tag: string) => void; // Optional callback when a tag is removed
  className?: string; // Optional class for container
  badgeClassName?: string; // Optional class for badges
  inputClassName?: string; // Optional class for input
}

export function TagInput({
  tags,
  setTags,
  maxTags,
  onTagAdd,
  onTagRemove,
  className,
  badgeClassName,
  inputClassName,
  disabled,
  ...props
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState(""); // current input value
  const inputRef = React.useRef<HTMLInputElement>(null); // ref to the input field
  const containerRef = React.useRef<HTMLDivElement>(null); // ref to the container

  // Update input value as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Add a new tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();

    // Don't add empty tags or duplicates
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    // Respect maxTags limit
    if (maxTags !== undefined && tags.length >= maxTags) return;

    const newTags = [...tags, trimmedTag];
    setTags(newTags);
    onTagAdd?.(trimmedTag); // callback if provided
    setInputValue(""); // clear input after adding
  };

  // Remove a tag by index
  const removeTag = (indexToRemove: number) => {
  const tagToRemove = tags[indexToRemove]!; // assert it's not undefined
  const newTags = tags.filter((_, index) => index !== indexToRemove);
  setTags(newTags);
  onTagRemove?.(tagToRemove);
  inputRef.current?.focus();
};


  // Handle keyboard events for adding/removing tags
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      removeTag(tags.length - 1);
    }
  };

  // Focus input when container is clicked
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col w-full space-y-2", className)}>
      {/* Tag badges */}
      <div className="flex flex-wrap gap-2 my-4 min-h-8" aria-live="polite">
        {tags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className={cn("px-3 py-1 text-sm", badgeClassName)}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-full"
              aria-label={`Remove ${tag}`}
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input field (always visible) */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={cn(
          "flex items-center w-full",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || (maxTags !== undefined && tags.length >= maxTags)}
          className={cn(inputClassName, "flex-1")}
          {...props}
        />
      </div>

      {/* Max tags helper text */}
      {maxTags !== undefined && (
        <p className="text-xs text-muted-foreground">
          {tags.length} of {maxTags} tags added
        </p>
      )}
    </div>
  );
}
