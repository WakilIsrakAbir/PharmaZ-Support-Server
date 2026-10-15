import { OTHER_ISSUE } from "../products/product.constants.js";
import { productModels } from "../../config/product-db.js";
import { HttpError } from "../../utils/http-error.js";

// A call's area, issue, status and priority must come from its product's
// setup. Switched-off options can't be picked for new calls, but a call that already
// has one keeps it when it is edited.

/**
 * Checks a new or edited call against the product's setup and returns the values to save.
 * `current` is the saved call when editing, undefined when creating.
 */
export async function applyProductSetup(product, body, current) {
  const errors = {};
  const values = { ...body };

  if (!current) {
    Object.assign(values, await checkArea(product, body, errors));
  }

  for (const [field, options] of [
    ["status", product.statuses],
    ["priority", product.priorities],
  ]) {
    const value = checkOption(options, body[field], current?.[field], field, errors);
    if (value === undefined) delete values[field];
    else values[field] = value;
  }

  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, "Validation failed", errors);
  }
  return values;
}

async function checkArea(product, { area: areaId, issue }, errors) {
  if (!areaId) {
    if (issue) errors.area = "Pick a problem area for this issue.";
    return {};
  }

  const { ProblemArea } = productModels(product);
  const area = await ProblemArea.findOne({ _id: areaId, product: product._id, isActive: true });
  if (!area) {
    errors.area = "That problem area isn't available.";
    return {};
  }

  const isListed = area.issues.some((option) => option.isActive && option.label === issue);
  if (issue && !isListed && issue !== OTHER_ISSUE) {
    errors.issue = `Pick one of the issues listed under ${area.name}.`;
  }

  return { area: area._id, areaName: area.name };
}

/** Returns the key to save: the given one, the current one, or the list's default for a new call. */
function checkOption(options, given, current, field, errors) {
  if (given === undefined) {
    return current === undefined ? options.find((option) => option.isDefault)?.key : undefined;
  }
  if (given === current) return given;

  if (!options.some((option) => option.key === given && option.isActive)) {
    errors[field] = `That ${field} isn't available.`;
  }
  return given;
}

