import { User } from "../auth/user.model.js";
import { WITH_AGENT } from "../calls/call.model.js";
import { productModels } from "../../config/product-db.js";
import { localDateKey, startOfLocalDay, startOfLocalMonth, toMongoTimezone } from "../../utils/local-dates.js";

// The product's dashboard. Runs behind requireAuth + resolveProduct, so it only ever
// counts `req.product`'s calls (kept in the product's own database).

const TOP_AREAS = 8;
const TOP_AGENTS = 5;
const RECENT_CALLS = 6;

export async function getDashboard(req, res) {
  const { days, tz } = req.validated.query;
  const product = req.product._id;
  const inProduct = { product };
  const periodStart = startOfLocalDay(tz, days - 1);
  const inPeriod = { product, calledAt: { $gte: periodStart } };
  const { Call } = productModels(req.product);
  const countBy = (match, field, limit) => countCallsBy(Call, match, field, limit);

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
      busiestAgents(Call, inPeriod),
      countBy(inPeriod, "$direction"),
      Call.find(inProduct).sort({ calledAt: -1, _id: -1 }).limit(RECENT_CALLS).populate(WITH_AGENT),
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

/**
 * The agents who logged the most calls: [{ id, name, count }]. Accounts live in the main
 * database, so their names are looked up separately (no join across databases).
 */
async function busiestAgents(Call, match) {
  const top = await countCallsBy(Call, match, "$createdBy", TOP_AGENTS);
  const users = await User.find({ _id: { $in: top.map(({ key }) => key) } }, { name: 1 });
  const nameOf = new Map(users.map((user) => [user.id, user.name]));
  return top.map(({ key, count }) => ({ id: String(key), name: nameOf.get(String(key)), count }));
}

/** [{ key, count }] grouped by `field`, biggest first. Calls with no value come back as key null. */
function countCallsBy(Call, match, field, limit) {
  return Call.aggregate([
    { $match: match },
    { $group: { _id: field, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    ...(limit ? [{ $limit: limit }] : []),
    { $project: { _id: 0, key: "$_id", count: 1 } },
  ]);
}
