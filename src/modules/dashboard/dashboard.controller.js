import { Call } from "../calls/call.model.js";
import { localDateKey, startOfLocalDay, startOfLocalMonth, toMongoTimezone } from "../../utils/local-dates.js";

// The product's dashboard. Runs behind requireAuth + resolveProduct, so it only ever
// counts `req.product`'s calls.

const TOP_AREAS = 8;
const TOP_AGENTS = 5;
const RECENT_CALLS = 6;

export async function getDashboard(req, res) {
  const { days, tz } = req.validated.query;
  const product = req.product._id;
  const inProduct = { product };
  const periodStart = startOfLocalDay(tz, days - 1);
  const inPeriod = { product, calledAt: { $gte: periodStart } };

  const [today, last7Days, thisMonth, allTime, daily, byStatus, byArea, byAgent, byDirection, recent] =
    await Promise.all([
      Call.countDocuments({ product, calledAt: { $gte: startOfLocalDay(tz) } }),
      Call.countDocuments({ product, calledAt: { $gte: startOfLocalDay(tz, 6) } }),
      Call.countDocuments({ product, calledAt: { $gte: startOfLocalMonth(tz) } }),
      Call.countDocuments(inProduct),
      countBy(inPeriod, {
        $dateToString: { format: "%Y-%m-%d", date: "$calledAt", timezone: toMongoTimezone(tz) },
      }),
      countBy(inPeriod, "$status"),
      countBy(inPeriod, "$areaName", TOP_AREAS),
      Call.aggregate([
        { $match: inPeriod },
        { $group: { _id: "$createdBy", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: TOP_AGENTS },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agent" } },
        { $project: { _id: 0, id: { $toString: "$_id" }, name: { $first: "$agent.name" }, count: 1 } },
      ]),
      countBy(inPeriod, "$direction"),
      Call.find(inProduct).sort({ calledAt: -1, _id: -1 }).limit(RECENT_CALLS).populate({ path: "createdBy", select: "name" }),
    ]);

  // One entry per day, including the quiet ones, oldest first
  const perDay = new Map(daily.map(({ key, count }) => [key, count]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = localDateKey(startOfLocalDay(tz, days - 1 - index), tz);
    return { date, count: perDay.get(date) ?? 0 };
  });

  res.json({
    data: {
      totals: { today, last7Days, thisMonth, allTime },
      period: { days, from: periodStart },
      daily: series,
      byStatus: byStatus.map(({ key, count }) => ({ status: key, count })),
      byArea: byArea.map(({ key, count }) => ({ area: key, count })),
      byAgent,
      byDirection: Object.fromEntries(byDirection.map(({ key, count }) => [key ?? "unknown", count])),
      recent,
    },
  });
}

/** [{ key, count }] grouped by `field`, biggest first. Calls with no value come back as key null. */
function countBy(match, field, limit) {
  return Call.aggregate([
    { $match: match },
    { $group: { _id: field, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    ...(limit ? [{ $limit: limit }] : []),
    { $project: { _id: 0, key: "$_id", count: 1 } },
  ]);
}
