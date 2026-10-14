import mongoose from "mongoose";
import { ProblemArea } from "./problem-area.model.js";
import { mergeOptionList, settleDefault } from "./option-list.js";
import { escapeRegExp } from "../../utils/escape-regexp.js";
import { HttpError } from "../../utils/http-error.js";

// Every route runs behind requireAuth + resolveProduct; the writes also behind
// requireProductAdmin. Each write answers with the whole setup, so the client can
// swap in the new version in one go.

/** Everything the forms need: statuses, priorities, custom fields and problem areas. */
async function loadSetup(product) {
  const areas = await ProblemArea.find({ product: product._id }).sort({ order: 1, createdAt: 1 });
  const { id, name, slug, description, accentColor, statuses, priorities, customFields } = product.toJSON();
  return { product: { id, name, slug, description, accentColor }, statuses, priorities, customFields, areas };
}

export async function getSetup(req, res) {
  res.json({ data: await loadSetup(req.product) });
}

export async function updateProduct(req, res) {
  req.product.set(req.validated.body);
  await req.product.save();
  res.json({ data: await loadSetup(req.product) });
}

export async function replaceStatuses(req, res) {
  const merged = mergeOptionList(req.product.statuses, req.validated.body.statuses, "statuses");
  req.product.statuses = settleDefault(merged, "statuses");
  await req.product.save();
  res.json({ data: await loadSetup(req.product) });
}

export async function replacePriorities(req, res) {
  const merged = mergeOptionList(req.product.priorities, req.validated.body.priorities, "priorities");
  req.product.priorities = settleDefault(merged, "priorities");
  await req.product.save();
  res.json({ data: await loadSetup(req.product) });
}

export async function replaceCustomFields(req, res) {
  const savedTypes = new Map(req.product.customFields.map((field) => [field.key, field.type]));

  // Changing a field's type would make the answers already saved on calls meaningless
  for (const field of req.validated.body.customFields) {
    if (field.key && savedTypes.has(field.key) && savedTypes.get(field.key) !== field.type) {
      const message = `"${field.label}" already has answers, so its type can't change. Add a new field instead.`;
      throw new HttpError(400, message, { customFields: message });
    }
  }

  req.product.customFields = mergeOptionList(req.product.customFields, req.validated.body.customFields, "customFields");
  await req.product.save();
  res.json({ data: await loadSetup(req.product) });
}

export async function createArea(req, res) {
  const { name, icon, issues } = req.validated.body;
  await assertAreaNameFree(req.product, name);

  const last = await ProblemArea.findOne({ product: req.product._id }).sort({ order: -1 });
  await ProblemArea.create({
    product: req.product._id,
    name,
    icon,
    order: (last?.order ?? -1) + 1,
    issues: mergeIssues([], issues),
  });

  res.status(201).json({ data: await loadSetup(req.product) });
}

export async function updateArea(req, res) {
  const area = await findArea(req);
  const { name, icon, isActive, issues } = req.validated.body;

  if (name !== undefined && name.toLowerCase() !== area.name.toLowerCase()) {
    await assertAreaNameFree(req.product, name);
  }

  area.set({
    ...(name !== undefined && { name }),
    ...(icon !== undefined && { icon }),
    ...(isActive !== undefined && { isActive }),
  });
  if (issues) area.issues = mergeIssues(area.issues, issues);
  await area.save();

  res.json({ data: await loadSetup(req.product) });
}

/** Saves a new order for the cards on the Log a Call form. Needs every area's id. */
export async function reorderAreas(req, res) {
  const { ids } = req.validated.body;
  const areas = await ProblemArea.find({ product: req.product._id }, { _id: 1 });
  const known = new Set(areas.map((area) => area.id));

  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw new HttpError(400, "Send every problem area exactly once.", { ids: "Send every problem area exactly once." });
  }

  await ProblemArea.bulkWrite(
    ids.map((id, order) => ({ updateOne: { filter: { _id: id, product: req.product._id }, update: { $set: { order } } } })),
  );

  res.json({ data: await loadSetup(req.product) });
}

async function findArea(req) {
  const { id } = req.params;
  const area = mongoose.isValidObjectId(id) ? await ProblemArea.findOne({ _id: id, product: req.product._id }) : null;
  if (!area) throw new HttpError(404, "Problem area not found");
  return area;
}

async function assertAreaNameFree(product, name) {
  const taken = await ProblemArea.exists({ product: product._id, name: new RegExp(`^${escapeRegExp(name)}$`, "i") });
  if (taken) {
    const message = "There's already a problem area with this name.";
    throw new HttpError(409, message, { name: message });
  }
}

/**
 * Same idea as mergeOptionList, for issues (which are matched by id):
 * edited ones update, new ones are added, and left-out ones are switched off.
 */
function mergeIssues(saved, edited) {
  const savedById = new Map(saved.map((issue) => [issue.id, issue]));
  const seen = new Set();

  const merged = edited.map(({ id, label, isActive }) => {
    if (id && !savedById.has(id)) {
      throw new HttpError(400, "Unknown issue.", { issues: "One of the issues no longer exists. Reload and try again." });
    }
    const lower = label.toLowerCase();
    if (seen.has(lower)) {
      throw new HttpError(400, `"${label}" is listed twice.`, { issues: `"${label}" is listed twice.` });
    }
    seen.add(lower);
    savedById.delete(id);
    return id ? { _id: id, label, isActive } : { label, isActive };
  });

  const leftOut = [...savedById.values()].map((issue) => ({ _id: issue._id, label: issue.label, isActive: false }));
  return [...merged, ...leftOut];
}
