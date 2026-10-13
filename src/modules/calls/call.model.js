import mongoose from "mongoose";
import { DIRECTIONS } from "./call.constants.js";

const callSchema = new mongoose.Schema(
  {
    // The product this call belongs to. Every query filters by it.
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    mobile: { type: String, required: true, index: true },
    customerId: { type: String, trim: true },
    transactionNo: { type: String, trim: true },

    // The area is also saved by name, so the call reads the same after the area is renamed
    area: { type: mongoose.Schema.Types.ObjectId, ref: "ProblemArea", index: true },
    areaName: { type: String, trim: true },
    issue: { type: String, trim: true },

    // Keys from the product's own lists (product.priorities / product.statuses)
    priority: { type: String },
    status: { type: String, index: true },

    direction: { type: String, enum: DIRECTIONS, default: "inbound" },
    durationSeconds: { type: Number, min: 0 },
    calledAt: { type: Date, default: Date.now },

    outcome: { type: String, trim: true },
    comments: { type: String, trim: true },

    // Answers to the product's extra form fields, by field key
    customFields: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // The agent who logged the call
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      versionKey: false,
      // Send `id` instead of Mongo's `_id`
      transform(_doc, call) {
        call.id = call._id.toString();
        delete call._id;
        delete call.product;
        return call;
      },
    },
  },
);

// The Logs page lists the newest calls first
callSchema.index({ product: 1, calledAt: -1 });

export const Call = mongoose.model("Call", callSchema);
