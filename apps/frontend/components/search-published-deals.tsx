"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useTransition } from "react";

import { Loader2, EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SearchPublishedDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const published = searchParams.get("published") === "true";

  const handleToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (!published) {
        params.set("published", "true");
        params.set("page", "1");
      } else {
        params.delete("published");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      className="relative flex h-8 items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching && (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      )}
      <Button
        className="h-8 px-3"
        variant={published ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isSearching}
      >
        {published ? (
          <EyeIcon className="mr-2 size-4" />
        ) : (
          <EyeOffIcon className="mr-2 size-4" />
        )}
        {published ? "Showing Published Deals" : "Show published Deals"}
      </Button>
    </div>
  );
}
