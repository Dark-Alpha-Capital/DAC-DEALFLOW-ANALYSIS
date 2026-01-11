import { Card, CardContent } from "@/components/ui/card";
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
    <Card
      className={cn(
        "border border-border shadow-md transition-shadow hover:shadow-lg",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight",
                !hasValue && "text-muted-foreground"
              )}
            >
              {formatValue()}
            </p>
            {trend && hasValue && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm",
                  trend.direction === "up"
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {trend.direction === "up" ? "+" : "-"}
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
