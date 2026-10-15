import { User } from "../auth/user.model.js";
import { productModels } from "../../config/product-db.js";
import { dateKeysBetween, startOfDateKey } from "../../utils/local-dates.js";
import { performancePipeline } from "./performance.pipeline.js";

// How each agent did over a period: calls handled, how many are closed or still awaiting
// action, call length, direction, calls per day and why customers called.
// Runs behind requireAuth + resolveProduct; everyone in the product can see it.

const TOP_REASONS = 5;
const NO_CALLS = { calls: 0, closed: 0, inbound: 0, outbound: 0, timedCalls: 0, timedSeconds: 0 };

export async function getPerformance(req, res) {
  const { from, to, agents: pickedIds, tz } = req.validated.query;
  const product = req.product._id;
  const days = dateKeysBetween(from, to);
  const closedStatuses = req.product.statuses.filter((status) => status.isClosed);
  const { Call } = productModels(req.product);

  const [[stats], members] = await Promise.all([
    Call.aggregate(
      performancePipeline({
        match: { product, calledAt: { $gte: startOfDateKey(from, tz), $lt: startOfDateKey(to, tz, 1) } },
        closedKeys: closedStatuses.map((status) => status.key),
        tz,
      }),
    ),
    User.find({ product }, { name: 1, role: 1, isSuperAdmin: 1 }).sort({ name: 1 }),
  ]);

  const statsOf = groupByAgent(stats, days);
  const people = await listPeople(members, statsOf.agentIds);
  const picked = new Set(pickedIds.length ? pickedIds : people.map((person) => person.id));
  const chosen = people.filter((person) => picked.has(person.id)).map((person) => ({ person, ...statsOf(person.id) }));

  const team = summarize(addUp(chosen.map(({ totals }) => totals)));
  const agents = chosen
    .map(({ person, totals, daily, reasons }) => ({
      ...person,
      ...summarize(totals),
      share: team.calls ? totals.calls / team.calls : 0,
      daily,
      ...topReasons(reasons),
    }))
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));

  res.json({
    data: {
      range: { from, to, days },
      closedStatuses: closedStatuses.map((status) => status.label),
      team: { ...team, daily: days.map((_, index) => chosen.reduce((sum, { daily }) => sum + daily[index], 0)) },
      agents,
    },
    // Everyone the filter can offer, picked or not
    people,
  });
}

/** The headline numbers. Rates and averages are null when there's nothing to base them on. */
function summarize({ calls, closed, inbound, outbound, timedCalls, timedSeconds }) {
  return {
    calls,
    closed,
    awaiting: calls - closed,
    resolvedRate: calls ? closed / calls : null,
    avgSeconds: timedCalls ? Math.round(timedSeconds / timedCalls) : null,
    inbound,
    outbound,
  };
}

function addUp(totalsList) {
  return totalsList.reduce(
    (sum, totals) => Object.fromEntries(Object.keys(NO_CALLS).map((key) => [key, sum[key] + totals[key]])),
    NO_CALLS,
  );
}

/**
 * Sorts the pipeline's rows by agent. Returns `statsOf(agentId)` ->
 * { totals, daily: [count per day, oldest first], reasons: [{ label, count }] },
 * which is all zeros for someone with no calls. `statsOf.agentIds` lists who had calls.
 */
function groupByAgent({ totals, daily, reasons }, days) {
  const dayIndex = new Map(days.map((day, index) => [day, index]));
  const byAgent = new Map();
  const empty = () => ({ totals: NO_CALLS, daily: days.map(() => 0), reasons: [] });

  const entry = (agentId) => {
    const id = String(agentId);
    if (!byAgent.has(id)) byAgent.set(id, empty());
    return byAgent.get(id);
  };

  for (const { _id, ...counts } of totals) entry(_id).totals = counts;
  for (const { _id, count } of daily) entry(_id.agent).daily[dayIndex.get(_id.date)] = count;
  for (const { _id, count } of reasons) entry(_id.agent).reasons.push({ label: reasonLabel(_id), count });

  const statsOf = (agentId) => byAgent.get(agentId) ?? empty();
  statsOf.agentIds = [...byAgent.keys()];
  return statsOf;
}

/** "Payout Issue - Beneficiary not credited" */
function reasonLabel({ area, issue }) {
  return [area, issue].filter(Boolean).join(" - ") || "No reason given";
}

/** The biggest few reasons, and how many calls the rest add up to. */
function topReasons(reasons) {
  const rest = reasons.slice(TOP_REASONS);
  return {
    reasons: reasons.slice(0, TOP_REASONS),
    otherReasons: { kinds: rest.length, calls: rest.reduce((sum, reason) => sum + reason.count, 0) },
  };
}

/**
 * Everyone who can be picked: the product's team, plus anyone who logged calls in the
 * period from outside it (someone since removed, or the super admin).
 */
async function listPeople(members, callerIds) {
  const memberIds = new Set(members.map((user) => user.id));
  const outsiderIds = callerIds.filter((id) => !memberIds.has(id));
  const outsiders = outsiderIds.length
    ? await User.find({ _id: { $in: outsiderIds } }, { name: 1, role: 1, isSuperAdmin: 1 })
    : [];
  const deleted = outsiderIds.filter((id) => !outsiders.some((user) => user.id === id));

  return [
    ...members.map((user) => toPerson(user, true)),
    ...outsiders.map((user) => toPerson(user, false)),
    ...deleted.map((id) => ({ id, name: "Removed account", role: "agent", isSuperAdmin: false, isMember: false })),
  ];
}

function toPerson(user, isMember) {
  return { id: user.id, name: user.name, role: user.role, isSuperAdmin: user.isSuperAdmin, isMember };
}
