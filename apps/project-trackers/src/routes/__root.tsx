/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";

function RootNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-16">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        This URL does not match any route.
      </p>
      <Link
        to="/project-trackers"
        className="text-primary text-sm font-medium underline-offset-4 hover:underline"
      >
        Go to projects
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
        title: "Project Trackers — Dark Alpha Capital",
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
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
