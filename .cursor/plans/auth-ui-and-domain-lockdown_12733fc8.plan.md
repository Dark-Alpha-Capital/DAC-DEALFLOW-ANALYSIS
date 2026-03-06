---
name: auth-ui-and-domain-lockdown
overview: Refactor authentication pages to remove card-based layouts in favor of a minimal, clean design and update Better Auth configuration to restrict all access to @darkalphacapital.com emails while preserving existing admin handling.
todos:
  - id: auth-ui-remove-cards
    content: Refactor all auth pages under apps/frontend/app/(authentication)/auth/* to remove shadcn Card components and implement a minimal, clean stacked layout for forms and status states.
    status: completed
  - id: better-auth-domain-signup
    content: Extend databaseHooks.user.create.before in apps/frontend/auth.ts to enforce an @darkalphacapital.com email whitelist with APIError messages while preserving existing admin role logic.
    status: completed
  - id: better-auth-domain-signin-session
    content: Add hooks.before middleware and extend callbacks.session in apps/frontend/auth.ts to block sign-in and session creation for non-@darkalphacapital.com users (including legacy accounts).
    status: completed
  - id: auth-error-ux-check
    content: Verify and, if needed, adjust auth error handling and copy (including /auth/error and ErrorCard) to clearly reflect the new internal-only domain restriction.
    status: completed
isProject: false
---

### Goals

- **UI cleanup**: Remove all card-based layouts from authentication routes under `apps/frontend/app/(authentication)/auth/*` and replace them with a minimal, clean layout aligned with your frontend-design skill.
- **Access restriction**: Ensure only users with `@darkalphacapital.com` email addresses can sign up and log in, across email/password and Google auth, without breaking existing admin role logic.

### Scope & Key Files

- **UI files** (authentication pages):
  - `[apps/frontend/app/(authentication)/auth/login/page.tsx]`
  - `[apps/frontend/app/(authentication)/auth/signup/page.tsx]`
  - `[apps/frontend/app/(authentication)/auth/forgot-password/page.tsx]`
  - `[apps/frontend/app/(authentication)/auth/reset-password/page.tsx]`
  - `[apps/frontend/app/(authentication)/auth/verify-email/page.tsx]`
  - `[apps/frontend/app/(authentication)/auth/error/page.tsx]`
  - `[apps/frontend/app/(authentication)/layout.tsx]` (layout wrapper, likely minimal changes)
- **Auth config**:
  - `[apps/frontend/auth.ts]` (Better Auth server configuration, database hooks, callbacks)

### Implementation Details

#### 1) Replace Card-Based Auth Layouts with Minimal Design

- **Remove `Card` imports and wrappers** in each auth page component listed above, keeping functional logic (forms, handlers, toasts, routing) intact.
- **Introduce a simple, shared auth shell layout** directly in each page (or a small local shared component if helpful) that uses:
  - A bare `div` with `max-w-md w-full mx-auto` inside the existing centered layout from `layout.tsx`.
  - Minimal typography hierarchy: product label (`DAC DEALFLOW`), page title, short description, then the form, using spacing and simple borders/dividers instead of cards.
  - Subtle separators (`Separator` or simple border-top) where needed (e.g. between Google button and email form) without card chrome.
- **Adjust visuals toward a brutal-minimal style**, per the frontend-design skill:
  - Rely on clean typography, spacing, and a few accent utilities (e.g. muted text, underline-on-hover) instead of shadows, rounded cards, or heavy backgrounds.
  - Keep icons and status treatments (success/error) but place them inline or in simple circles/divs rather than card headers.
- **Apply this treatment consistently** across:
  - `login` and `signup` (shared minimal hero/title + stacked form layout).
  - `forgot-password` and `reset-password` (clear titles, explanatory copy, form below).
  - `verify-email` and `auth/error` states (simple status blocks with icon + message + CTA buttons, no enclosing card).
- **Retain `ErrorCard` alerts** as-is since they are not card-based layouts (they use `Alert`), only adjust if necessary for spacing within the new minimal container.

#### 2) Enforce @darkalphacapital.com Email Domain on Sign-Up

- **Leverage `databaseHooks.user.create.before`** in `[apps/frontend/auth.ts]` (already present) to enforce domain restriction at user-creation time:
  - Import `APIError` from `"better-auth/api"`.
  - In the existing `user.create.before` hook, normalize `user.email` to lowercase, derive `domain = email.split("@")[1]`, and verify it equals `"darkalphacapital.com"`.
  - If the domain is missing or invalid, throw `new APIError("BAD_REQUEST", { message: "Invalid email address" })`.
  - If the domain is not `darkalphacapital.com`, throw `new APIError("UNPROCESSABLE_ENTITY", { message: "Only darkalphacapital.com emails are allowed." })`.
  - Preserve and extend the existing logic that determines the `role` from `adminEmails` (keep admins working exactly as now) and sets `isBlocked: false`.
- This aligns with the Better Auth docs and Q&A recommendation to use `databaseHooks.user.create.before` for domain validation while still centralizing role assignment.

#### 3) Restrict Sign-In to @darkalphacapital.com and Handle Legacy Users

- **Add a `hooks.before` middleware** in `[apps/frontend/auth.ts]` using `createAuthMiddleware` from `"better-auth/api"` to guard sign-in:
  - For the email sign-in endpoint (`ctx.path === "/sign-in/email"`), inspect `ctx.body?.email`, normalize to lowercase, and ensure `email.endsWith("@darkalphacapital.com")`.
  - If the check fails, throw `new APIError("UNAUTHORIZED", { message: "Only darkalphacapital.com emails are allowed." })` so the client gets a clear, specific message.
- **Harden session creation / legacy access** via the existing `callbacks.session`:
  - Extend the `db.select` inside `callbacks.session` to also fetch `users.email`.
  - If `dbUser.email` does not end with `@darkalphacapital.com`, return `null` from the session callback, preventing creation of a usable session for any legacy non-corporate accounts that may exist.
  - Keep the existing `isBlocked` behavior unchanged so manual blocking still works.
- **OAuth/Google sign-in behavior**:
  - Rely on the `databaseHooks.user.create.before` domain check to prevent creation of new Google-based users with non-`darkalphacapital.com` emails.
  - For any pre-existing Google users with non-corporate emails, the extended `callbacks.session` domain check ensures their sessions are invalidated.

#### 4) Error Surfacing & UX Integration

- Confirm that domain and access errors thrown as `APIError` propagate through your `authClient` and are displayed via existing `toast.error` calls in the auth pages.
- Optionally, wire up unauthorized-domain cases to the existing `/auth/error` route by:
  - Allowing Better Auth to redirect to your `errorCallbackURL` including an `error=AccessDenied` parameter, or
  - Mapping specific `APIError` messages or codes in the frontend and redirecting to `/auth/error?error=AccessDenied` when appropriate.
- Make sure the copy in `ErrorCard` for `AccessDenied` matches the new domain policy (“Only Dark Alpha Capital corporate accounts can access this platform”).

#### 5) Testing

- **UI sanity checks**:
  - Verify all auth pages still render correctly on desktop and mobile widths with the new minimal layout and that focus states and basic accessibility (labels, contrast) are preserved.
- **Auth behavior tests**:
  - Sign up with `user@darkalphacapital.com` via email/password → success and email verification flows work.
  - Sign up with a non-`darkalphacapital.com` email → see explicit domain restriction error, no user created.
  - Sign in (email/password) with `@darkalphacapital.com` → success.
  - Sign in (email/password) with non-`darkalphacapital.com` → explicit domain restriction error.
  - Google sign-in with `@darkalphacapital.com` Google account → success.
  - Google sign-in with non-`darkalphacapital.com` Google account → blocked at user creation (or session) with clear error.

### Notes

- Admin behavior remains unchanged: `adminEmails` will continue to assign `UserRole.ADMIN` for configured addresses, as today, but only within the allowed `darkalphacapital.com` domain.
- All changes are localized to the auth pages and `auth.ts`; no impact on the rest of the app routing or protected pages beyond the stricter session eligibility.
