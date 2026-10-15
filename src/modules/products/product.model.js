import mongoose from "mongoose";
import { clearOnWrite, createDocCache } from "../../utils/doc-cache.js";

// What a brand-new product starts with. The product admin can change all of it.
const DEFAULT_STATUSES = [
  { key: "completed", label: "Completed", color: "emerald", isClosed: true },
  { key: "pending", label: "Pending", color: "amber", isDefault: true },
  { key: "resolved", label: "Resolved", color: "sky", isClosed: true },
  { key: "under-review", label: "Under Review", color: "violet" },
];

const DEFAULT_PRIORITIES = [
  { key: "low", label: "Low", color: "slate" },
  { key: "normal", label: "Normal", color: "sky", isDefault: true },
  { key: "high", label: "High", color: "amber" },
  { key: "urgent", label: "Urgent", color: "rose" },
];

// Statuses and priorities share a shape. "Deleting" one sets isActive: false,
// so calls that already use it still show its name.
const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: "slate" },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

// A status can also close a call. On the Performance page closed calls count as
// resolved, and the rest as still awaiting action.
const statusSchema = optionSchema.clone();
statusSchema.add({ isClosed: { type: Boolean, default: false } });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Short, URL-safe name, e.g. "pharmaz247"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    accentColor: { type: String, default: "emerald" },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    statuses: { type: [statusSchema], default: () => DEFAULT_STATUSES },
    priorities: { type: [optionSchema], default: () => DEFAULT_PRIORITIES },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, product) {
        product.id = product._id.toString();
        delete product._id;
        return product;
      },
    },
  },
);

/** The few fields the app shell needs (sidebar name and colour). */
productSchema.methods.toSummary = function toSummary() {
  return { id: this.id, name: this.name, slug: this.slug, accentColor: this.accentColor };
};

/** Products, read on every request by resolveProduct. Emptied by any write to products. */
export const productCache = createDocCache(() => Product);
clearOnWrite(productSchema, productCache);

export const Product = mongoose.model("Product", productSchema);
