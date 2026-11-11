/**
 * lib/reservation-dates.ts
 *
 * Mati FoodFinder - Pure domain utilities for table reservation date generation,
 * formatting, and ISO YYYY-MM-DD serialization.
 */

export interface ReservationDateOption {
  iso: string; // Standard ISO "YYYY-MM-DD"
  label: string; // "Today", "Tomorrow", "Thu, Oct 16"
  shortDay: string; // "Today", "Tomorrow", "Thu"
  dayNum: string; // "Oct 14"
}

/**
 * Generates an array of consecutive booking date options starting today.
 * Every option provides a standard ISO YYYY-MM-DD date string for PostgreSQL persistence
 * along with user-friendly presentation labels.
 */
export function generateUpcomingReservationDates(daysCount = 14, baseDate: Date = new Date()): ReservationDateOption[] {
  const options: ReservationDateOption[] = [];

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${day}`;

    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

    let label = `${dayName}, ${monthName} ${d.getDate()}`;
    let shortDay = dayName;
    if (i === 0) {
      label = "Today";
      shortDay = "Today";
    } else if (i === 1) {
      label = "Tomorrow";
      shortDay = "Tomorrow";
    }

    options.push({
      iso,
      label,
      shortDay,
      dayNum: `${monthName} ${d.getDate()}`,
    });
  }

  return options;
}

/**
 * Formats a raw reservation date string for display in order cards and merchant queues.
 * Gracefully handles legacy strings like "Tonight", "Today", as well as ISO "YYYY-MM-DD".
 */
export function formatReservationDate(rawDate: string, refDate: Date = new Date()): string {
  if (!rawDate) return "Today";
  const trimmed = rawDate.trim();
  if (trimmed.toLowerCase() === "tonight" || trimmed.toLowerCase() === "today") return "Today";
  if (trimmed.toLowerCase() === "tomorrow") return "Tomorrow";

  // Check if it's an ISO YYYY-MM-DD format
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    if (!isNaN(d.getTime())) {
      const todayIso = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}-${String(
        refDate.getDate()
      ).padStart(2, "0")}`;

      const tomorrow = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
      const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(
        tomorrow.getDate()
      ).padStart(2, "0")}`;

      if (trimmed === todayIso) {
        return `Today (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      }
      if (trimmed === tomorrowIso) {
        return `Tomorrow (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      }

      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
  }

  return rawDate;
}
