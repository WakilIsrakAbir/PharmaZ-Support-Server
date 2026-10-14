import { z } from "zod";
import { timezoneOffset } from "../dashboard/dashboard.validator.js";

export const MAX_DAYS = 92;
const MAX_AGENTS = 50;
const DAY = 86_400_000;

// A calendar date in the viewer's timezone. Round-tripping catches days like 2026-02-31.
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-07-01.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Use a real date.");

// "id1,id2" -> ["id1", "id2"]. Left out, the report covers everyone.
const agentIds = z
  .string()
  .optional()
  .transform((value) => [...new Set((value ?? "").split(",").map((id) => id.trim()).filter(Boolean))])
  .refine((ids) => ids.every((id) => /^[a-f\d]{24}$/i.test(id)), "Unknown agent id.")
  .refine((ids) => ids.length <= MAX_AGENTS, `Pick at most ${MAX_AGENTS} people.`);

export const performanceQuerySchema = z
  .object({
    // Both days are included
    from: dateKey,
    to: dateKey,
    agents: agentIds,
    tz: timezoneOffset,
  })
  .refine(({ from, to }) => from <= to, { error: "Pick an end date on or after the start.", path: ["to"] })
  .refine(({ from, to }) => (Date.parse(to) - Date.parse(from)) / DAY < MAX_DAYS, {
    error: `Pick at most ${MAX_DAYS} days.`,
    path: ["to"],
  });
