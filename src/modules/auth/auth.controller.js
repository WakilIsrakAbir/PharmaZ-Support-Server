import { User } from "./user.model.js";
import { clearAuthCookie, setAuthCookie } from "./auth-token.js";
import { passwordResetEmail } from "./auth.emails.js";
import { createResetToken, hashPassword, hashResetToken, verifyPassword } from "./password.js";
import { HttpError } from "../../utils/http-error.js";
import { sendMail } from "../../utils/mailer.js";

const EMAIL_TAKEN = "An account with this email already exists.";

export async function register(req, res) {
  const { name, email, password } = req.validated.body;

  if (await User.exists({ email })) {
    throw new HttpError(409, EMAIL_TAKEN, { email: EMAIL_TAKEN });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    lastLoginAt: new Date(),
  });

  setAuthCookie(res, user);
  res.status(201).json({ data: user });
}

export async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select("+passwordHash");
  const isPasswordCorrect = user && (await verifyPassword(password, user.passwordHash));

  // Same message either way, so nobody can find out which emails have accounts
  if (!isPasswordCorrect) {
    throw new HttpError(401, "Incorrect email or password.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookie(res, user);
  res.json({ data: user });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.status(204).end();
}

export async function forgotPassword(req, res) {
  const { email } = req.validated.body;
  const user = await User.findOne({ email });

  if (user) {
    const { token, tokenHash, expiresAt } = createResetToken();
    user.resetTokenHash = tokenHash;
    user.resetTokenExpiresAt = expiresAt;
    await user.save();

    // Not awaited: waiting for the mail server would make this reply slower for real
    // accounts, and the timing difference would reveal which emails are registered.
    sendMail({ to: user.email, ...passwordResetEmail({ name: user.name, token }) }).catch((error) =>
      console.error("Couldn't send the password reset email:", error.message),
    );
  }

  // The same answer whether or not the account exists
  res.status(204).end();
}

export async function resetPassword(req, res) {
  const { token, password } = req.validated.body;
  const user = await User.findOne({
    resetTokenHash: hashResetToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");
  }

  await user.setPassword(password);
  user.lastLoginAt = new Date();
  await user.save();

  // Log them straight in with the new password
  setAuthCookie(res, user);
  res.json({ data: user });
}
