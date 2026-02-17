import { cn, formatNumberWithCommas } from "@/lib/utils";
import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DealMetricCardProps {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  format?: "currency" | "percentage" | "number" | "text";
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  className?: string;
}

export function DealMetricCard({
  label,
  value,
  icon,
  format = "text",
  trend,
  className,
}: DealMetricCardProps) {
  const formatValue = () => {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    switch (format) {
      case "currency":
        return `$${formatNumberWithCommas(String(value))}`;
      case "percentage":
        return `${value}%`;
      case "number":
        return formatNumberWithCommas(String(value));
      default:
        return String(value);
    }
  };

  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div
      className={cn(
        "flex items-start justify-between border-b border-border py-4",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-lg font-semibold tracking-tight tabular-nums",
            !hasValue && "text-muted-foreground",
          )}
        >
          {formatValue()}
        </p>
        {trend && hasValue && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              trend.direction === "up"
                ? "text-foreground"
                : "text-destructive",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {trend.direction === "up" ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>
      {icon && (
        <div className="text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
      )}
    </div>
  );
}
