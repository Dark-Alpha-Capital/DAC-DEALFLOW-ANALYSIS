
import { ClientOnly } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <ClientOnly
      fallback={
        <div
          className={cn(
            "size-full whitespace-pre-wrap [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            className
          )}
        >
          {props.children}
        </div>
      }
    >
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        {...props}
      />
    </ClientOnly>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
