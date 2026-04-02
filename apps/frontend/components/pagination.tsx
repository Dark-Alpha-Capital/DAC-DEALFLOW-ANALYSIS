import { Link } from "@tanstack/react-router";
import { usePathname, useSearchParams } from "@/lib/navigation-shim";

import { Button } from "@/components/ui/button";

interface IPagination {
  totalPages: number;
}

const SIBLING_COUNT = 2;

function getVisiblePageNumbers(
  totalPages: number,
  currentPage: number,
): (number | "ellipsis")[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 1) return [1];
  const clamped = Math.max(1, Math.min(currentPage, totalPages));
  const start = Math.max(2, clamped - SIBLING_COUNT);
  const end = Math.min(totalPages - 1, clamped + SIBLING_COUNT);

  const items: (number | "ellipsis")[] = [1];
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push("ellipsis");
  if (totalPages > 1) items.push(totalPages);
  return items;
}

export default function Pagination({ totalPages }: IPagination) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPage = Number(searchParams.get("page")) || 1;
  const currentPage = Math.max(1, Math.min(rawPage, totalPages || 1));
  const visiblePages = getVisiblePageNumbers(totalPages, currentPage);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1 md:mt-8">
      <Button asChild variant="outline" size="sm">
        <Link
          to={createPageURL(currentPage - 1)}
          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          preload="intent"
        >
          Previous
        </Link>
      </Button>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {visiblePages.map((item, i) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="text-muted-foreground px-2">
              …
            </span>
          ) : (
            <Button
              key={item}
              asChild
              variant={item === currentPage ? "default" : "outline"}
              size="sm"
            >
              <Link
                to={createPageURL(item)}
                preload="intent"
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </Link>
            </Button>
          ),
        )}
      </nav>
      <Button asChild variant="outline" size="sm">
        <Link
          to={createPageURL(currentPage + 1)}
          className={
            currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
          }
          preload="intent"
        >
          Next
        </Link>
      </Button>
    </div>
  );
}
