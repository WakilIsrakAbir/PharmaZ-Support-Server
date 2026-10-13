import { z } from "zod";

/** The browser's Date.getTimezoneOffset(), so "today" means the viewer's today. */
export const timezoneOffset = z.coerce
  .number()
  .int()
  .min(-840, "Use the browser's timezone offset in minutes.")
  .max(840, "Use the browser's timezone offset in minutes.")
  .default(0);

export const dashboardQuerySchema = z.object({
  // The chart and the breakdowns cover the last `days` days, today included
  days: z.coerce
    .number()
    .int()
    .refine((days) => [7, 30, 90].includes(days), "Use 7, 30 or 90 days.")
    .default(30),
  tz: timezoneOffset,
});
