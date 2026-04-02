
import * as React from "react";
import type { PropsWithChildren } from "react";
import type { TooltipProps } from "recharts";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContainerProps = PropsWithChildren<{
  config: ChartConfig;
  className?: string;
}>;

/**
 * Lightweight chart container inspired by shadcn/ui.
 * Sets CSS variables like `--color-series` or falls back to `--chart-N`.
 */
export function ChartContainer(props: ChartContainerProps) {
  const { config, className, children } = props;

  const style = React.useMemo(() => {
    const entries = Object.entries(config);
    const vars: Record<string, string> = {};

    entries.forEach(([key, value], index) => {
      const colorVar = value.color || `var(--chart-${Math.min(index + 1, 5)})`;
      vars[`--color-${key}`] = colorVar;
    });

    return vars as React.CSSProperties;
  }, [config]);

  return (
    <div data-chart className={cn("relative flex-1", className)} style={style}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export type ChartTooltipContentProps = TooltipProps<number, string> & {
  className?: string;
  /**
   * When provided, uses this key from the payload's data as the display name.
   */
  nameKey?: string;
};

/**
 * Generic tooltip content for Recharts tooltips.
 */
export function ChartTooltipContent(props: ChartTooltipContentProps) {
  const { active, payload, label, className, nameKey, labelFormatter } = props;

  if (!active || !payload || payload.length === 0) return null;

  const formattedLabel =
    typeof labelFormatter === "function"
      ? labelFormatter(label, payload)
      : (label as React.ReactNode);

  return (
    <div
      className={cn(
        "bg-popover rounded-md border px-3 py-2 text-xs shadow-sm",
        className,
      )}
    >
      {formattedLabel && (
        <div className="text-muted-foreground mb-1 text-[0.7rem] font-medium">
          {formattedLabel}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, index) => {
          if (!entry || entry.value == null) return null;
          const color =
            (entry.color as string | undefined) ||
            `var(--color-${String(entry.name)})`;
          const valueName =
            (nameKey &&
              typeof entry.payload === "object" &&
              entry.payload &&
              (entry.payload as any)[nameKey]) ||
            entry.name;

          return (
            <div
              key={index}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full border"
                  style={{ backgroundColor: color }}
                />
                <span className="text-foreground text-[0.7rem]">
                  {String(valueName)}
                </span>
              </div>
              <span className="text-foreground font-medium">
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Thin wrapper around Recharts Tooltip so we have a stable import path.
 */
export function ChartTooltip(
  props: React.ComponentProps<typeof Tooltip>,
): React.ReactElement {
  return <Tooltip {...props} wrapperStyle={{ outline: "none" }} />;
}
