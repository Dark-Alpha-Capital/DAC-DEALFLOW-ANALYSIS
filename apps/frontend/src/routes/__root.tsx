/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "./globals.css?url";

function RootNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-16">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        This URL does not match any route. Check the address or return to the
        app.
      </p>
      <Link
        to="/"
        className="text-primary text-sm font-medium underline-offset-4 hover:underline"
      >
        Go to home
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  notFoundComponent: RootNotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Dark Alpha Capital Deal Sourcing Organization",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Source+Serif+4:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  // suppressHydrationWarning: theme class on <html> can differ SSR vs client
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
