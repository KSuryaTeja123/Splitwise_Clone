const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Builds the `splits` array from the request body depending on splitType.
 * - equal: divide amount evenly across all `participantIds` (remainder cents
 *   go to the first participant so totals always add up exactly)
 * - unequal: caller supplies exact amount per participant
 * - percentage: caller supplies percentage per participant, we convert to amount
 */
function buildSplits({ splitType, amount, participants }) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new ApiError(400, 'At least one participant is required');
  }

  if (splitType === 'equal') {
    const n = participants.length;
    const base = Math.floor((amount / n) * 100) / 100;
    const splits = participants.map((p) => ({ user: p.user, amount: base }));
    const distributed = base * n;
    const remainder = Math.round((amount - distributed) * 100) / 100;
    splits[0].amount = Math.round((splits[0].amount + remainder) * 100) / 100;
    return splits;
  }

  if (splitType === 'unequal') {
    const splits = participants.map((p) => ({ user: p.user, amount: p.amount }));
    const total = splits.reduce((s, x) => s + x.amount, 0);
    if (Math.abs(total - amount) > 0.5) {
      throw new ApiError(400, 'Sum of unequal splits must equal the total amount');
    }
    return splits;
  }

  if (splitType === 'percentage') {
    const totalPct = participants.reduce((s, p) => s + p.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.5) {
      throw new ApiError(400, 'Percentages must add up to 100');
    }
    return participants.map((p) => ({
      user: p.user,
      amount: Math.round(((p.percentage / 100) * amount) * 100) / 100,
    }));
  }

  throw new ApiError(400, `Unsupported splitType: ${splitType}`);
}

// @route POST /api/groups/:groupId/expenses
const addExpense = asyncHandler(async (req, res) => {
  const { description, amount, paidBy, splitType = 'equal', participants } = req.body;

  if (!description || !amount || !paidBy) {
    throw new ApiError(400, 'description, amount and paidBy are required');
  }

  const splits = buildSplits({ splitType, amount, participants });

  const expense = await Expense.create({
    group: req.params.groupId,
    description,
    amount,
    paidBy,
    splitType,
    splits,
    createdBy: req.user._id,
  });

  const populated = await expense.populate([
    { path: 'paidBy', select: 'name email' },
    { path: 'splits.user', select: 'name email' },
  ]);

  res.status(201).json({ success: true, expense: populated });
});

// @route GET /api/groups/:groupId/expenses
const listExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ group: req.params.groupId })
    .populate('paidBy', 'name email')
    .populate('splits.user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, expenses });
});

// @route DELETE /api/groups/:groupId/expenses/:expenseId
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({
    _id: req.params.expenseId,
    group: req.params.groupId,
  });
  if (!expense) throw new ApiError(404, 'Expense not found');
  res.status(200).json({ success: true, message: 'Expense deleted' });
});

module.exports = { addExpense, listExpenses, deleteExpense, buildSplits };
