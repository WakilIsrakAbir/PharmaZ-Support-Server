// A short-lived copy of documents that nearly every request reads (the logged-in user and
// their product), so a request doesn't wait on the database for them each time.
//
// - Each read gets its own fresh document, so a request can change and save it without
//   touching anyone else's copy.
// - Any write to the collection empties the cache (see the hooks in the models), so a
//   password change, role change or removal takes effect on the next request.
// - Entries also expire after `ttlMs`, which covers writes from outside this server
//   process (scripts, another instance).

/**
 * `getModel` returns the model; it's a function because the cache is made (and hooked
 * into the schema) before the model is compiled.
 */
export function createDocCache(getModel, { ttlMs = 30_000, maxEntries = 1_000 } = {}) {
  const entries = new Map();

  return {
    /** The document saved under `key`, or what `load()` finds (cached if it finds one). */
    async get(key, load) {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > Date.now()) return getModel().hydrate(hit.data);

      const doc = await load();
      if (doc) {
        if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
        entries.set(key, { data: doc.toObject({ depopulate: true }), expiresAt: Date.now() + ttlMs });
      }
      return doc;
    },

    clear() {
      entries.clear();
    },
  };
}

/** Mongoose hooks after which a cache of the model must be emptied: every way it can be written. */
export const WRITE_HOOKS = {
  document: ["save", "deleteOne", "updateOne"],
  query: [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ],
};

/** Empties `cache` after any write to `schema`'s collection. */
export function clearOnWrite(schema, cache) {
  const clear = () => cache.clear();
  schema.post(WRITE_HOOKS.document, { document: true, query: false }, clear);
  schema.post(WRITE_HOOKS.query, { document: false, query: true }, clear);
  schema.post("insertMany", clear);
  schema.post("bulkWrite", clear);
}
