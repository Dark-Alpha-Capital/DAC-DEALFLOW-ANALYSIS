import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WorkspacePanelProps = {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkspacePanel({
  title,
  description,
  children,
  className,
  contentClassName,
}: WorkspacePanelProps) {
  return (
    <Card
      className={cn(
        "border-border/60 gap-0 overflow-hidden rounded-lg py-0 shadow-none",
        className,
      )}
    >
      <CardHeader className="border-border/60 space-y-1 border-b px-4 py-4 sm:px-6">
        <CardTitle className="text-base font-medium tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed sm:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent
        className={cn(
          "px-4 py-4 sm:px-6 sm:py-5",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
