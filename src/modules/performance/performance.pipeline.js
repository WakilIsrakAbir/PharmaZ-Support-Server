import { toMongoTimezone } from "../../utils/local-dates.js";

/**
 * One pass over the period's calls, counted per agent (`createdBy`):
 *
 * - totals:  calls, closed ones, inbound / outbound, and the calls with a duration
 * - daily:   calls per agent per day, in the viewer's timezone
 * - reasons: calls per agent per area + issue, biggest first
 */
export function performancePipeline({ match, closedKeys, tz }) {
  const hasDuration = { $gt: ["$durationSeconds", 0] };

  return [
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: "$createdBy",
              calls: { $sum: 1 },
              closed: { $sum: { $cond: [{ $in: ["$status", closedKeys] }, 1, 0] } },
              inbound: { $sum: { $cond: [{ $eq: ["$direction", "inbound"] }, 1, 0] } },
              outbound: { $sum: { $cond: [{ $eq: ["$direction", "outbound"] }, 1, 0] } },
              timedCalls: { $sum: { $cond: [hasDuration, 1, 0] } },
              timedSeconds: { $sum: { $cond: [hasDuration, "$durationSeconds", 0] } },
            },
          },
        ],
        daily: [
          {
            $group: {
              _id: {
                agent: "$createdBy",
                date: { $dateToString: { format: "%Y-%m-%d", date: "$calledAt", timezone: toMongoTimezone(tz) } },
              },
              count: { $sum: 1 },
            },
          },
        ],
        reasons: [
          { $group: { _id: { agent: "$createdBy", area: "$areaName", issue: "$issue" }, count: { $sum: 1 } } },
          { $sort: { count: -1, "_id.area": 1, "_id.issue": 1 } },
        ],
      },
    },
  ];
}
