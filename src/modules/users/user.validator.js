import { z } from "zod";
import { USER_ROLES } from "../auth/user.model.js";

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Part of a name or email address
  search: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
  role: z.enum(USER_ROLES).optional(),
});

export const updateUserSchema = z.strictObject({
  role: z.enum(USER_ROLES, { error: "Role must be agent or admin." }),
});

/** The person being added: an email, plus a name in case they need a new account. */
export const newMemberSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .max(80, "Name must be 80 characters or fewer.")
    .refine((value) => value === "" || value.length >= 2, "Name must be at least 2 characters.")
    .optional()
    .transform((value) => value || undefined),
  email: z
    .string({ error: "Enter an email address." })
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
});
