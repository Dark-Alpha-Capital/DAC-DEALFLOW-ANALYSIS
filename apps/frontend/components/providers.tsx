import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider disableTransitionOnChange>
      <TooltipProvider>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
