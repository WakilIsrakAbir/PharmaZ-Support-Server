/** Makes user input safe to put inside a RegExp, so "(1)" matches literally. */
export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
