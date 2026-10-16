const TZ = "Asia/Jakarta";

/** Calendar date (YYYY-MM-DD) of an instant, as seen in Asia/Jakarta. */
export function jakartaDateString(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function toDayNumber(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** Whole calendar days from anniversary (YYYY-MM-DD) to `now`, counted in Jakarta local days. */
export function daysTogether(anniversary: string, now: Date = new Date()): number {
  return Math.max(0, toDayNumber(jakartaDateString(now)) - toDayNumber(anniversary));
}
