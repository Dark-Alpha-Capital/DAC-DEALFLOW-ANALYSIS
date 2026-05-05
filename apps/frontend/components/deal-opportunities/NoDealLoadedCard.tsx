import type { ReactNode } from "react";
import { CircleHelp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reloadPage } from "@/lib/bitrix-widget-shared";

export function NoDealLoadedCard({
  title = "No deal is loaded yet",
  description,
  children,
}: {
  title?: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
      <Card className="border-border/80 w-full max-w-lg shadow-md">
        {children}
        <CardHeader className="items-center space-y-3 pb-2 text-center">
          <div
            className="bg-primary/12 text-primary flex size-14 items-center justify-center rounded-full"
            aria-hidden
          >
            <CircleHelp className="size-7" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground max-w-prose text-[15px] leading-relaxed text-pretty">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm leading-relaxed">
          <div className="space-y-2">
            <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
              What you can do
            </p>
            <ul className="marker:text-primary list-inside list-disc space-y-1.5 pl-0.5">
              <li>
                <span className="text-foreground font-medium">
                  In Bitrix24:
                </span>{" "}
                open the widget from the deal card or menu so the app loads with
                the correct deal.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Local / manual test:
                </span>{" "}
                add a deal id to the address bar, for example{" "}
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  ?dealId=123
                </code>
                , plus the same auth query params your environment expects.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  After it worked once:
                </span>{" "}
                this tab saves the last deal in{" "}
                <span className="text-foreground">session storage</span>. Use
                reload below if the page opened blank but you had loaded a deal
                earlier in the same tab.
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2 sm:pt-4">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={reloadPage}
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-sm sm:h-11"
          >
            <RefreshCw className="size-5 shrink-0" aria-hidden />
            Reload page
          </Button>
          <p className="text-muted-foreground text-center text-xs leading-snug">
            Tip: if you pasted a long widget URL, check that{" "}
            <code className="text-foreground font-mono">dealId</code> (or{" "}
            <code className="text-foreground font-mono">DEAL_ID</code>) is
            present and not truncated.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
