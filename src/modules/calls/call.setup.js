import { ProblemArea } from "../products/problem-area.model.js";
import { OTHER_ISSUE } from "../products/product.constants.js";
import { HttpError } from "../../utils/http-error.js";

// A call's area, issue, status, priority and extra fields must come from its product's
// setup. Switched-off options can't be picked for new calls, but a call that already
// has one keeps it when it is edited.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  if (body.customFields !== undefined || !current) {
    values.customFields = checkCustomFields(product.customFields, body.customFields ?? {}, current && (current.customFields ?? {}), errors);
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

/** Merges the given answers into the saved ones, checking each against its field. */
function checkCustomFields(fields, given, saved, errors) {
  const isEdit = saved !== undefined;
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const answers = { ...(saved ?? {}) };

  for (const [key, raw] of Object.entries(given)) {
    const field = byKey.get(key);
    const path = `customFields.${key}`;

    if (!field) {
      errors[path] = "Unknown field.";
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : raw;
    if (value === null || value === "") {
      delete answers[key];
      continue;
    }
    // Answers to a switched-off field can stay as they are, but not change
    if (!field.isActive && value !== saved?.[key]) {
      errors[path] = `"${field.label}" is no longer in use.`;
      continue;
    }

    const problem = checkAnswer(field, value);
    if (problem) errors[path] = problem;
    else answers[key] = field.type === "number" ? Number(value) : value;
  }

  // On an edit, only the answers being changed are held to "required": an older call
  // isn't blocked by a field that became required after it was logged
  for (const field of fields) {
    const isChecked = !isEdit || field.key in given;
    if (isChecked && field.isActive && field.required && answers[field.key] === undefined && !errors[`customFields.${field.key}`]) {
      errors[`customFields.${field.key}`] = `${field.label} is required.`;
    }
  }

  return answers;
}

function checkAnswer(field, value) {
  switch (field.type) {
    case "number":
      return Number.isFinite(Number(value)) ? null : `${field.label} must be a number.`;
    case "select":
      return field.options.includes(value) ? null : `Pick one of the options for ${field.label}.`;
    case "date":
      return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
        ? null
        : `${field.label} must be a date (YYYY-MM-DD).`;
    default:
      return typeof value === "string" && value.length <= 500 ? null : `Keep ${field.label} to 500 characters.`;
  }
}
