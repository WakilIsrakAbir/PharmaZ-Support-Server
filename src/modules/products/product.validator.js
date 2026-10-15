import { z } from "zod";
import { ACCENT_COLORS, AREA_ICONS, OPTION_COLORS } from "./product.constants.js";

const label = (what, max = 40) =>
  z
    .string({ error: `Give the ${what} a name.` })
    .trim()
    .min(1, `Give the ${what} a name.`)
    .max(max, `Keep it to ${max} characters.`);

// Saved items come back with their key; new ones don't have one yet
const key = z.string().trim().min(1).max(60).optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Unknown id.");

export const updateProductSchema = z.strictObject({
  name: label("product", 60).optional(),
  description: z.string().trim().max(200).optional(),
  accentColor: z.enum(ACCENT_COLORS).optional(),
});

const optionSchema = (what) =>
  z.strictObject({
    key,
    label: label(what),
    color: z.enum(OPTION_COLORS).default("slate"),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  });

export const statusesSchema = z.strictObject({
  statuses: z
    .array(optionSchema("status").extend({ isClosed: z.boolean().default(false) }))
    .min(1, "Add at least one status.")
    .max(20, "Keep it to 20 statuses."),
});

export const prioritiesSchema = z.strictObject({
  priorities: z.array(optionSchema("priority")).min(1, "Add at least one priority.").max(20, "Keep it to 20 priorities."),
});

const issuesSchema = z
  .array(
    z.strictObject({
      id: objectId.optional(),
      label: label("issue", 120),
      isActive: z.boolean().default(true),
    }),
  )
  .max(60, "Keep it to 60 issues per area.");

export const createAreaSchema = z.strictObject({
  name: label("problem area", 60),
  icon: z.enum(AREA_ICONS).default("life-buoy"),
  issues: issuesSchema.default([]),
});

export const updateAreaSchema = z.strictObject({
  name: label("problem area", 60).optional(),
  icon: z.enum(AREA_ICONS).optional(),
  isActive: z.boolean().optional(),
  issues: issuesSchema.optional(),
});

export const reorderAreasSchema = z.strictObject({
  ids: z.array(objectId).min(1),
});
