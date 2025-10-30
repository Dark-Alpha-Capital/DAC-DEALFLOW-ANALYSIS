import { ReactNode } from "react";

interface DealDetailItemProps {
  icon: ReactNode;
  label: string;
  value: string | number | undefined | null;
}

export function DealDetailItem({ icon, label, value }: DealDetailItemProps) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-background p-2 shadow-sm">
      <div className="text-sm text-primary">{icon}</div>
      <span className="text-xs font-medium">{label}:</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
