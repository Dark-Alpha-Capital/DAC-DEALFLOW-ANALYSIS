import type { ReactNode } from "react";
import { CircleHelp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <main className="bg-muted/20 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
      <div className="border-border/20 bg-background w-full max-w-lg rounded-2xl border p-8 sm:p-10">
        {children}
        <div className="items-center space-y-4 pb-6 text-center">
          <div
            className="bg-muted text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-2xl"
            aria-hidden
          >
            <CircleHelp className="size-7" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-foreground text-[22px] font-semibold tracking-[-0.02em] sm:text-2xl">
              {title}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-[38ch] text-[15px] leading-relaxed text-pretty">
              {description}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
          <p className="text-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
            What you can do
          </p>
          <ul className="space-y-2">
            <li className="text-[13px] leading-relaxed">
              <span className="text-foreground font-medium">In Bitrix24:</span>{" "}
              open the widget from the deal card or menu so the app loads with
              the correct deal.
            </li>
            <li className="text-[13px] leading-relaxed">
              <span className="text-foreground font-medium">
                Local / manual test:
              </span>{" "}
              add a deal id to the address bar, for example{" "}
              <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs">
                ?dealId=123
              </code>
              , plus the same auth query params your environment expects.
            </li>
            <li className="text-[13px] leading-relaxed">
              <span className="text-foreground font-medium">
                After it worked once:
              </span>{" "}
              this tab saves the last deal in{" "}
              <span className="text-foreground font-medium">session storage</span>
              . Use reload below if the page opened blank but you had loaded a
              deal earlier in the same tab.
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 pt-6">
          <Button
            type="button"
            size="lg"
            onClick={reloadPage}
            className="h-11 w-full cursor-pointer gap-2 font-medium transition-transform active:scale-[0.98]"
          >
            <RefreshCw className="size-4 shrink-0" aria-hidden />
            Reload page
          </Button>
          <p className="text-muted-foreground text-center text-xs leading-snug">
            Tip: if you pasted a long widget URL, check that{" "}
            <code className="text-foreground font-mono">dealId</code> (or{" "}
            <code className="text-foreground font-mono">DEAL_ID</code>) is
            present and not truncated.
          </p>
        </div>
      </div>
    </main>
  );
}
