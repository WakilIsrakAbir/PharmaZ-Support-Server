import { z } from "zod";

const email = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const registerSchema = z.strictObject({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email,
  password: z
    .string({ error: "Enter a password." })
    .min(8, "Use at least 8 characters.")
    .max(128, "Use 128 characters or fewer."),
});

export const loginSchema = z.strictObject({
  email,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});
