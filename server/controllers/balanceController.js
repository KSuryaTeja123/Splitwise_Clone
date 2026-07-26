const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeNetBalances, simplifyDebts } = require('../services/debtSimplifier');

async function getGroupNetBalances(groupId, memberIds) {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).lean(),
    Settlement.find({ group: groupId }).lean(),
  ]);
  return computeNetBalances(expenses, settlements, memberIds.map((id) => id.toString()));
}

async function attachNames(net) {
  const users = await User.find({ _id: { $in: Object.keys(net) } }).select('name email');
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = { name: u.name, email: u.email };
  });
  return Object.entries(net).map(([userId, amount]) => ({
    userId,
    ...userMap[userId],
    balance: amount,
  }));
}

// @route GET /api/groups/:groupId/balances  (raw net balance per member)
const getBalances = asyncHandler(async (req, res) => {
  const group = req.group;
  const net = await getGroupNetBalances(group._id, group.members);
  const balances = await attachNames(net);
  res.status(200).json({ success: true, balances });
});

// @route GET /api/groups/:groupId/simplify  (minimal transactions to settle up)
const getSimplifiedDebts = asyncHandler(async (req, res) => {
  const group = req.group;
  const net = await getGroupNetBalances(group._id, group.members);
  const transactions = simplifyDebts(net);

  const users = await User.find({ _id: { $in: group.members } }).select('name email');
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = { name: u.name, email: u.email };
  });

  const enriched = transactions.map((t) => ({
    from: { userId: t.from, ...userMap[t.from] },
    to: { userId: t.to, ...userMap[t.to] },
    amount: t.amount,
  }));

  res.status(200).json({ success: true, transactions: enriched });
});

// @route POST /api/groups/:groupId/settle
const settleUp = asyncHandler(async (req, res) => {
  const { from, to, amount, note } = req.body;
  if (!from || !to || !amount) {
    throw new ApiError(400, 'from, to and amount are required');
  }
  if (from === to) throw new ApiError(400, 'from and to must be different users');

  const settlement = await Settlement.create({
    group: req.params.groupId,
    from,
    to,
    amount,
    note,
  });

  const populated = await settlement.populate([
    { path: 'from', select: 'name email' },
    { path: 'to', select: 'name email' },
  ]);

  res.status(201).json({ success: true, settlement: populated });
});

// @route GET /api/groups/:groupId/activity  (combined feed of expenses + settlements)
const getActivity = asyncHandler(async (req, res) => {
  const groupId = req.params.groupId;
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).populate('paidBy', 'name email').lean(),
    Settlement.find({ group: groupId })
      .populate('from', 'name email')
      .populate('to', 'name email')
      .lean(),
  ]);

  const feed = [
    ...expenses.map((e) => ({ type: 'expense', ...e })),
    ...settlements.map((s) => ({ type: 'settlement', ...s })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({ success: true, activity: feed });
});

module.exports = { getBalances, getSimplifiedDebts, settleUp, getActivity };
