import mongoose from "mongoose";
import { CALL_STATUSES, DIRECTIONS, PRIORITIES, PROBLEM_AREAS } from "./call.constants.js";

const callSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, index: true },
    customerId: { type: String, trim: true },
    transactionNo: { type: String, trim: true },

    area: { type: String, enum: PROBLEM_AREAS, index: true },
    issue: { type: String, trim: true },
    priority: { type: String, enum: PRIORITIES, default: "normal" },

    direction: { type: String, enum: DIRECTIONS, default: "inbound" },
    status: { type: String, enum: CALL_STATUSES, default: "pending", index: true },
    durationSeconds: { type: Number, min: 0 },
    calledAt: { type: Date, default: Date.now },

    outcome: { type: String, trim: true },
    comments: { type: String, trim: true },

    // The agent who logged the call
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      // Send `id` instead of Mongo's `_id`
      transform(_doc, call) {
        call.id = call._id.toString();
        delete call._id;
        return call;
      },
    },
  },
);

// The Logs page lists the newest calls first
callSchema.index({ calledAt: -1 });

export const Call = mongoose.model("Call", callSchema);
