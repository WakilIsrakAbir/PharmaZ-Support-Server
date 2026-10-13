import mongoose from "mongoose";
import { Call } from "./call.model.js";
import { HttpError } from "../../utils/http-error.js";

// Express 5 passes errors from async handlers to the error handler automatically.

export async function createCall(req, res) {
  const call = await Call.create({ ...req.validated.body, createdBy: req.user._id });
  res.status(201).json({ data: call });
}

export async function listCalls(req, res) {
  const { page, limit, ...filters } = req.validated.query;

  // Only filter on the values that were actually given
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));

  const [calls, total] = await Promise.all([
    Call.find(query)
      .sort({ calledAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Call.countDocuments(query),
  ]);

  res.json({
    data: calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getCall(req, res) {
  const { id } = req.params;
  const call = mongoose.isValidObjectId(id) ? await Call.findById(id) : null;

  if (!call) {
    throw new HttpError(404, "Call not found");
  }

  res.json({ data: call });
}
