import mongoose from "mongoose";
import { AREA_ICONS } from "./product.constants.js";

// Issues are never deleted, only switched off, so old calls keep pointing at real text
const issueSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
});

/** One card on the Log a Call form ("Inventory & Stock"), with the issues listed under it. */
const problemAreaSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, enum: AREA_ICONS, default: "life-buoy" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    issues: { type: [issueSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, area) {
        area.id = area._id.toString();
        delete area._id;
        delete area.product;
        area.issues = area.issues.map(({ _id, ...issue }) => ({ id: _id.toString(), ...issue }));
        return area;
      },
    },
  },
);

export const ProblemArea = mongoose.model("ProblemArea", problemAreaSchema);
