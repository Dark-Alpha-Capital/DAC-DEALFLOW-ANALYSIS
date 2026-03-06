"use client";

import ThemeCard from "@/components/ThemeCard";
import type { Theme } from "@repo/db";
import Pagination from "@/components/pagination";

interface ThemeContainerProps {
  data: Theme[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function ThemeContainer({
  data,
  currentPage,
  totalPages,
  totalCount,
}: ThemeContainerProps) {
  return (
    <div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        {data.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-xl">No themes found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {data.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
