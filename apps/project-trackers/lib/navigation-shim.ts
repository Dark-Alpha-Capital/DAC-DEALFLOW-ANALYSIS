import {
  notFound,
  redirect as tsRedirect,
  useNavigate,
  useRouter as useTanStackRouter,
  useRouterState,
} from "@tanstack/react-router";

export { notFound };

/** Next-compatible `redirect("/path")` → TanStack redirect. */
export function redirect(url: string): never {
  throw tsRedirect({ to: url, replace: true });
}

/**
 * App router shim: navigation + TanStack Router loader invalidation.
 * Call `invalidate()` after mutations so route loaders refetch immediately (ignores staleTime).
 * @see https://tanstack.com/router/latest/docs/framework/react/api/router/RouterType#invalidate-method
 */
export function useRouter() {
  const navigate = useNavigate();
  const tanstackRouter = useTanStackRouter();
  return {
    push: (href: string) => {
      void navigate({ to: href });
    },
    replace: (href: string) => {
      void navigate({ to: href, replace: true });
    },
    /** Full document reload — prefer `invalidate()` so SPA state and loaders stay in sync. */
    refresh: () => {
      if (typeof window !== "undefined") window.location.reload();
    },
    prefetch: (_href: string) => { },
    back: () => {
      if (typeof window !== "undefined") window.history.back();
    },
    invalidate: (opts?: Parameters<typeof tanstackRouter.invalidate>[0]) => {
      void tanstackRouter.invalidate(opts);
    },
  };
}

export function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function useSearchParams(): URLSearchParams {
  return useRouterState({
    select: (s) => {
      try {
        const href = s.location.href;
        return new URL(href, "http://localhost").searchParams;
      } catch {
        return new URLSearchParams();
      }
    },
  });
}
