// Allowed values for a call. Keep these in sync with client/src/config/call-log.js.

// One per PharmaZ247 module
export const PROBLEM_AREAS = [
  "pos",
  "sales",
  "inventory",
  "purchase",
  "appointments",
  "accounting",
  "master-data",
  "setup",
  "access",
  "general",
];

export const PRIORITIES = ["low", "normal", "high", "urgent"];

export const DIRECTIONS = ["inbound", "outbound"];

export const CALL_STATUSES = ["resolved", "follow-up", "escalated", "callback", "unreachable"];
