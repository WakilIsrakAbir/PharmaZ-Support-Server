import mongoose from "mongoose";
import { Call } from "./call.model.js";
import { normalizeMobile } from "./call.validator.js";
import { HttpError } from "../../utils/http-error.js";

// Express 5 passes errors from async handlers to the error handler automatically.

// Every call is sent with the name of the agent who logged it
const WITH_AGENT = { path: "createdBy", select: "name" };

export async function createCall(req, res) {
  const call = await Call.create({ ...req.validated.body, createdBy: req.user._id });
  await call.populate(WITH_AGENT);
  res.status(201).json({ data: call });
}

export async function listCalls(req, res) {
  const { page, limit, search, from, to, ...filters } = req.validated.query;

  // Only filter on the values that were actually given
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));

  if (search) query.$or = searchConditions(search);
  if (from || to) {
    query.calledAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lt: new Date(to) }) };
  }

  const [calls, total] = await Promise.all([
    Call.find(query)
      .sort({ calledAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(WITH_AGENT),
    Call.countDocuments(query),
  ]);

  res.json({
    data: calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getCall(req, res) {
  const call = await findCall(req.params.id);
  await call.populate(WITH_AGENT);
  res.json({ data: call });
}

export async function updateCall(req, res) {
  const call = await findCall(req.params.id);

  if (!call.createdBy.equals(req.user._id) && req.user.role !== "admin") {
    throw new HttpError(403, "Only the agent who logged this call, or an admin, can update it.");
  }

  call.set(req.validated.body);
  await call.save();
  await call.populate(WITH_AGENT);

  res.json({ data: call });
}

async function findCall(id) {
  const call = mongoose.isValidObjectId(id) ? await Call.findById(id) : null;

  if (!call) {
    throw new HttpError(404, "Call not found");
  }

  return call;
}

// Matches part of a transaction no. ("inv004") or of a mobile number ("1712", "+880 1712")
function searchConditions(search) {
  const conditions = [{ transactionNo: new RegExp(escapeRegExp(search), "i") }];
  const digits = normalizeMobile(search);

  if (/^\d+$/.test(digits)) {
    conditions.push({ mobile: new RegExp(escapeRegExp(digits)) });
  }

  return conditions;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
