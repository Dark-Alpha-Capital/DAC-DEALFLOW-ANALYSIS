/**
 * Stubs for Next.js cache APIs. Worker and tRPC still call these for compatibility;
 * data freshness relies on TanStack Query / navigation reloads.
 */
export function revalidatePath(_path: string): void { }

export function revalidateTag(
  _tag: string,
  _profile?: "max" | "hours" | "minutes" | "seconds",
): void { }

export function updateTag(_tag: string): void { }

/** No-op: replaced Next.js Cache Components. */
export function cacheLife(_profile: string): void { }

/** No-op: replaced Next.js Cache Components. */
export function cacheTag(_tag: string): void { }
