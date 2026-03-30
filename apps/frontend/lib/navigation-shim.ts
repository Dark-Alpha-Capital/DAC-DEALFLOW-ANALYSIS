import {
  notFound,
  redirect as tsRedirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";

export { notFound };

/** Next-compatible `redirect("/path")` → TanStack redirect. */
export function redirect(url: string): never {
  throw tsRedirect({ to: url, replace: true });
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => {
      void navigate({ to: href });
    },
    replace: (href: string) => {
      void navigate({ to: href, replace: true });
    },
    refresh: () => {
      if (typeof window !== "undefined") window.location.reload();
    },
    prefetch: (_href: string) => {},
    back: () => {
      if (typeof window !== "undefined") window.history.back();
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
