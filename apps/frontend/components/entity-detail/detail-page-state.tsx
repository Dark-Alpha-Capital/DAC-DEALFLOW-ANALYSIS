import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";

/** Key/value row used on entity detail pages. Renders nothing for empty values. */
export function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ComponentType<{ className?: string }>;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </span>
        <p className="mt-0.5 truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

/** Full-page error state shared by entity detail routes. */
export function DetailPageError({
  title,
  message,
  backTo,
  backLabel,
}: {
  title: string;
  message: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={backTo as never}>{backLabel}</Link>
        </Button>
      </div>
    </section>
  );
}

/** Full-page not-found state shared by entity detail routes. */
export function DetailPageNotFound({
  message,
  backTo,
  backLabel,
}: {
  message: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-lg font-medium">Not found</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={backTo as never}>{backLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
