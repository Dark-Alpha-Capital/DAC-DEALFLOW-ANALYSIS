/** Approximates Next.js `after()` for deferred side effects after the handler returns. */
export function after(task: () => void | Promise<void>): void {
  setImmediate(() => {
    void Promise.resolve(task());
  });
}
