/**
 * Debt Simplification Service
 * ----------------------------
 * Given a group's expenses and settlements, this module derives:
 *   1. The net balance of every member (positive = owed money, negative = owes money)
 *   2. A minimal set of transactions that settle all debts (greedy min-cash-flow)
 *
 * Design choice: balances are always DERIVED from Expenses + Settlements rather
 * than stored as a mutable field on the User/Group document. This avoids balance
 * drift bugs (e.g. a failed update leaving stale numbers) at the cost of a bit of
 * extra computation - a reasonable trade-off at this scale.
 */

/**
 * @param {Array} expenses - array of Expense docs (lean objects), each with paidBy & splits
 * @param {Array} settlements - array of Settlement docs (lean objects), each with from/to/amount
 * @param {Array<string>} memberIds - all member ids in the group (as strings)
 * @returns {Object} map of userId -> net balance (rounded to 2 decimals)
 */
function computeNetBalances(expenses, settlements, memberIds) {
  const net = {};
  memberIds.forEach((id) => {
    net[id] = 0;
  });

  expenses.forEach((exp) => {
    const paidBy = exp.paidBy.toString();
    net[paidBy] = (net[paidBy] || 0) + exp.amount;

    exp.splits.forEach((s) => {
      const uid = s.user.toString();
      net[uid] = (net[uid] || 0) - s.amount;
    });
  });

  settlements.forEach((s) => {
    const from = s.from.toString();
    const to = s.to.toString();
    // "from" already paid "to" in real life, so their debt reduces (net increases)
    net[from] = (net[from] || 0) + s.amount;
    net[to] = (net[to] || 0) - s.amount;
  });

  // round to avoid floating point noise like 49.999999999
  Object.keys(net).forEach((k) => {
    net[k] = Math.round(net[k] * 100) / 100;
  });

  return net;
}

/**
 * Greedy min-cash-flow simplification.
 * Matches the largest creditor against the largest debtor repeatedly.
 * Produces at most (n - 1) transactions for n people with non-zero balance.
 * Time complexity: O(n log n) due to sorting.
 *
 * Note: this greedy approach is a well-known good approximation. Finding the
 * mathematically optimal minimum number of transactions in the general case is
 * NP-hard (related to subset-sum), so greedy is the practical, industry-standard
 * choice used by apps like Splitwise itself.
 *
 * @param {Object} net - map of userId -> net balance from computeNetBalances
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
function simplifyDebts(net) {
  const EPSILON = 0.01;
  const creditors = [];
  const debtors = [];

  Object.entries(net).forEach(([user, amt]) => {
    if (amt > EPSILON) creditors.push({ user, amt });
    else if (amt < -EPSILON) debtors.push({ user, amt: -amt });
  });

  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const settledAmount = Math.min(creditors[i].amt, debtors[j].amt);
    const rounded = Math.round(settledAmount * 100) / 100;

    if (rounded > 0) {
      transactions.push({
        from: debtors[j].user,
        to: creditors[i].user,
        amount: rounded,
      });
    }

    creditors[i].amt -= settledAmount;
    debtors[j].amt -= settledAmount;

    if (creditors[i].amt <= EPSILON) i += 1;
    if (debtors[j].amt <= EPSILON) j += 1;
  }

  return transactions;
}

module.exports = { computeNetBalances, simplifyDebts };
