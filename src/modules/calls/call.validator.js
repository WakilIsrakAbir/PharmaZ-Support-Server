import { z } from "zod";
import { CALL_STATUSES, DIRECTIONS, PRIORITIES, PROBLEM_AREAS } from "./call.constants.js";

// Bangladeshi mobile numbers, stored as 01XXXXXXXXX
const MOBILE_PATTERN = /^01[3-9]\d{8}$/;

/** "+880 1712-345678" -> "01712345678" */
export function normalizeMobile(value) {
  return value.replace(/[\s-]/g, "").replace(/^\+?88(?=01)/, "");
}

// The form sends "" for fields left empty, so treat those as not given.
const optionalText = (maxLength) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || undefined);

export const createCallSchema = z.strictObject({
  mobile: z
    .string({ error: "Enter the customer's mobile number." })
    .trim()
    .min(1, "Enter the customer's mobile number.")
    .transform(normalizeMobile)
    .refine((mobile) => MOBILE_PATTERN.test(mobile), "That doesn't look like a valid mobile number."),
  customerId: optionalText(50),
  transactionNo: optionalText(50),
  area: z.enum(PROBLEM_AREAS).optional(),
  issue: optionalText(200),
  priority: z.enum(PRIORITIES).default("normal"),
  direction: z.enum(DIRECTIONS).default("inbound"),
  status: z.enum(CALL_STATUSES).default("resolved"),
  durationSeconds: z.int().min(0).max(86_400).optional(),
  calledAt: z.iso.datetime({ offset: true }).optional(),
  outcome: optionalText(2000),
  comments: optionalText(5000),
});

export const listCallsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  mobile: z.string().trim().transform(normalizeMobile).optional(),
  area: z.enum(PROBLEM_AREAS).optional(),
  status: z.enum(CALL_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  direction: z.enum(DIRECTIONS).optional(),
});
