
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "@/lib/navigation-shim";
import { useTransition } from "react";

const THEME_FILTER_KEYS = [
  "query",
  "sector",
  "status",
  "minCapitalPriority",
  "maxCapitalPriority",
  "minConfidence",
  "maxConfidence",
  "page",
];

export default function DeleteThemeFiltersButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClearFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      THEME_FILTER_KEYS.forEach((key) => params.delete(key));
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleClearFilters}
      disabled={isPending}
      className="gap-2"
    >
      <XIcon className="h-4 w-4" />
      {isPending ? "Clearing..." : "Clear Filters"}
    </Button>
  );
}
