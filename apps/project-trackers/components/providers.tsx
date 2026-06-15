import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider disableTransitionOnChange>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ThemeProvider>
  );
}
