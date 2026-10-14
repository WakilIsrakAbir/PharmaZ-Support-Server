// "Today" depends on where the viewer is. The client sends its timezone offset as
// returned by Date.getTimezoneOffset(): minutes behind UTC (Dhaka is -360).

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Midnight at the start of the viewer's day, `daysAgo` days back, as a real Date. */
export function startOfLocalDay(tzOffset, daysAgo = 0, now = new Date()) {
  const local = new Date(now.getTime() - tzOffset * MINUTE);
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localMidnight + tzOffset * MINUTE - daysAgo * DAY);
}

/** The first moment of the viewer's current month. */
export function startOfLocalMonth(tzOffset, now = new Date()) {
  const local = new Date(now.getTime() - tzOffset * MINUTE);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + tzOffset * MINUTE);
}

/** "2026-07-01" -> the first moment of that day for the viewer (or `daysLater` days on). */
export function startOfDateKey(dateKey, tzOffset, daysLater = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + daysLater) + tzOffset * MINUTE);
}

/** Every calendar date from `from` to `to`, both included: ["2026-07-01", "2026-07-02", ...]. */
export function dateKeysBetween(from, to) {
  const keys = [];
  for (let time = Date.parse(from); time <= Date.parse(to); time += DAY) {
    keys.push(new Date(time).toISOString().slice(0, 10));
  }
  return keys;
}

/** -360 -> "+06:00", the form MongoDB's date operators take. */
export function toMongoTimezone(tzOffset) {
  const minutes = -tzOffset;
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** The viewer's calendar date ("2026-10-13") for a moment. */
export function localDateKey(date, tzOffset) {
  return new Date(date.getTime() - tzOffset * MINUTE).toISOString().slice(0, 10);
}
