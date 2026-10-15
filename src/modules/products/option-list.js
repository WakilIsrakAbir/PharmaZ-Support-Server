import { HttpError } from "../../utils/http-error.js";

/** "Under Review" -> "under-review" */
export function toKey(label) {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "option"
  );
}

/** A key from `label` that isn't in `takenKeys` yet ("pending", "pending-2", ...). */
function uniqueKey(label, takenKeys) {
  const base = toKey(label);
  let key = base;
  for (let n = 2; takenKeys.has(key); n++) key = `${base}-${n}`;
  takenKeys.add(key);
  return key;
}

/**
 * Applies an edited list (statuses or priorities) on top of the saved one.
 *
 * - Items that come with a `key` update the saved item with that key.
 * - Items without a key are new; their key is made from the label and never changes.
 * - Saved items missing from the edit are kept, switched off. Calls that already use
 *   them keep showing their name; they just stop appearing on forms.
 *
 * `fieldName` is used in error messages, e.g. "statuses".
 */
export function mergeOptionList(saved, edited, fieldName) {
  const savedByKey = new Map(saved.map((item) => [item.key, item]));
  const takenKeys = new Set(savedByKey.keys());
  const seenLabels = new Set();

  const merged = edited.map((item) => {
    if (item.key && !savedByKey.has(item.key)) {
      throw new HttpError(400, `Unknown key "${item.key}" in ${fieldName}.`, { [fieldName]: `Unknown key "${item.key}".` });
    }

    const label = item.label.trim().toLowerCase();
    if (seenLabels.has(label)) {
      throw new HttpError(400, `"${item.label}" is listed twice.`, { [fieldName]: `"${item.label}" is listed twice.` });
    }
    seenLabels.add(label);

    const key = item.key ?? uniqueKey(item.label, takenKeys);
    savedByKey.delete(key);
    return { ...item, key };
  });

  const leftOut = [...savedByKey.values()].map((item) => ({ ...plain(item), isActive: false, isDefault: false }));
  return [...merged, ...leftOut];
}

/**
 * Statuses and priorities need at least one active item and exactly one default,
 * and the default must be active. With no default given, the first active one is used.
 */
export function settleDefault(options, fieldName) {
  const active = options.filter((option) => option.isActive);
  if (active.length === 0) {
    throw new HttpError(400, `Keep at least one of the ${fieldName} switched on.`, { [fieldName]: "Keep at least one switched on." });
  }

  const defaults = options.filter((option) => option.isDefault);
  if (defaults.length > 1) {
    throw new HttpError(400, `Only one of the ${fieldName} can be the default.`, { [fieldName]: "Only one can be the default." });
  }
  if (defaults.length === 1 && !defaults[0].isActive) {
    throw new HttpError(400, "The default must be switched on.", { [fieldName]: "The default must be switched on." });
  }

  const defaultKey = defaults[0]?.key ?? active[0].key;
  return options.map((option) => ({ ...option, isDefault: option.key === defaultKey }));
}

// Mongoose subdocuments -> plain objects, so spreading copies the values
function plain(item) {
  return typeof item.toObject === "function" ? item.toObject() : item;
}
