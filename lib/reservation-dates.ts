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

/**
 * Parses a 12-hour or 24-hour time string into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string, fallbackPeriod?: string): number | null {
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] || fallbackPeriod;

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight (0..1439) into standard 12-hour format string (e.g. "7:00 AM", "8:45 PM").
 */
export function formatMinutesTo12Hour(minutes: number): string {
  const totalM = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, "0");
  return `${displayH}:${displayM} ${period}`;
}

export interface StoreOperatingWindow {
  openMinutes: number;
  closeMinutes: number;
  lastBookingMinutes: number;
  formattedHours: string;
}

/**
 * Parses a store's operating hours string (e.g. "7:00 AM - 9:00 PM Daily", "10:30 AM - 10:00 PM Daily")
 * and computes the opening time, closing time, and last acceptable table reservation slot (15 mins before close).
 */
export function parseOperatingWindow(hoursString?: string | null): StoreOperatingWindow {
  const fallback = "7:00 AM - 9:00 PM";
  const raw = hoursString?.trim() || fallback;

  if (/24\s*hours?/i.test(raw)) {
    return {
      openMinutes: 0,
      closeMinutes: 24 * 60,
      lastBookingMinutes: 23 * 60 + 45,
      formattedHours: "Open 24 Hours",
    };
  }

  const parts = raw.split(/[-–—]/);
  let openMinutes = 7 * 60; // 7:00 AM default
  let closeMinutes = 21 * 60; // 9:00 PM default

  if (parts.length >= 2) {
    const startStr = parts[0].trim();
    const endStr = parts[1].replace(/(Daily|Mon|Tue|Wed|Thu|Fri|Sat|Sun|[.,()])/gi, "").trim();

    const endPeriod = /PM/i.test(endStr) ? "PM" : /AM/i.test(endStr) ? "AM" : "PM";
    const startPeriod = /PM/i.test(startStr) ? "PM" : /AM/i.test(startStr) ? "AM" : undefined;

    const parsedStart = parseTimeToMinutes(startStr, startPeriod || "AM");
    const parsedEnd = parseTimeToMinutes(endStr, endPeriod);

    if (parsedStart !== null && parsedEnd !== null) {
      openMinutes = parsedStart;
      closeMinutes = parsedEnd;
    }
  }

  // Last reservation slot is 15 minutes before store closing (e.g. 8:45 PM for 9:00 PM close)
  const lastBookingMinutes = Math.max(openMinutes, closeMinutes - 15);

  return {
    openMinutes,
    closeMinutes,
    lastBookingMinutes,
    formattedHours: raw,
  };
}

/**
 * Generates dynamic available reservation time slots based on:
 * 1. The store's operating hours (open until closing minus 15 mins)
 * 2. Whether the reservation date is Today:
 *    - If Today: only time slots strictly after current time up to last booking time (e.g. 5:15 PM up to 8:45 PM if it's 5 PM).
 *    - If Future Date: all times between store opening and last booking time.
 */
export function generateAvailableTimeSlots(
  hoursString?: string | null,
  isToday = false,
  refDate: Date = new Date(),
  stepMinutes = 15
): string[] {
  const { openMinutes, lastBookingMinutes } = parseOperatingWindow(hoursString);
  const slots: string[] = [];

  let startMinutes = openMinutes;

  if (isToday) {
    const currentMinutes = refDate.getHours() * 60 + refDate.getMinutes();
    // Earliest booking slot is the next available step strictly after current time
    const nextSlotAfterNow = Math.floor(currentMinutes / stepMinutes + 1) * stepMinutes;
    startMinutes = Math.max(openMinutes, nextSlotAfterNow);
  }

  for (let m = startMinutes; m <= lastBookingMinutes; m += stepMinutes) {
    slots.push(formatMinutesTo12Hour(m));
  }

  return slots;
}

