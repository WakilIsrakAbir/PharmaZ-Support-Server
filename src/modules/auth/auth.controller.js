import { User } from "./user.model.js";
import { clearAuthCookie, setAuthCookie } from "./auth-token.js";
import { HttpError } from "../../utils/http-error.js";
import { hashPassword, verifyPassword } from "./password.js";

export async function register(req, res) {
  const { name, email, password } = req.validated.body;

  if (await User.exists({ email })) {
    throw new HttpError(409, "An account with this email already exists.", {
      email: "An account with this email already exists.",
    });
  }

  const user = await User.create({ name, email, passwordHash: await hashPassword(password) });

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

  setAuthCookie(res, user);
  res.json({ data: user });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.status(204).end();
}

export function getCurrentUser(req, res) {
  res.json({ data: req.user });
}
