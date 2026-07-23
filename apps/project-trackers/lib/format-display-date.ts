/** Coerce SQLite/Drizzle timestamps that were stored as ms but read as seconds. */
export function coerceSqliteDate(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Drizzle `mode: "timestamp"` multiplies by 1000; DB defaults often store ms.
  if (date.getUTCFullYear() > 2100) {
    return new Date(date.getTime() / 1000);
  }
  return date;
}

function dayOrdinal(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** e.g. "24th May 2026" */
export function formatDisplayDate(
  value: Date | string | number | null | undefined,
): string {
  const date = coerceSqliteDate(value);
  if (!date) return "—";
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "long" });
  const year = date.getFullYear();
  return `${day}${dayOrdinal(day)} ${month} ${year}`;
}
