/**
 * Dates are rendered in UK time explicitly. Server-rendered pages otherwise use
 * the server's timezone, which on Vercel is UTC and can show the wrong day for
 * an order placed late in the evening.
 */
export function formatUkDate(iso: string, withWeekday = false): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    ...(withWeekday ? { weekday: "long" } : {}),
    day: "numeric",
    month: "long",
    year: withWeekday ? undefined : "numeric",
  });
}
