
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing{" "}
          <span className="font-medium text-foreground">{data.length}</span> of{" "}
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          themes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
