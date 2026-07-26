const express = require('express');
const { protect, requireGroupMember } = require('../middleware/auth');
const {
  createGroup,
  listMyGroups,
  getGroup,
  addMember,
} = require('../controllers/groupController');
const { addExpense, listExpenses, deleteExpense } = require('../controllers/expenseController');
const {
  getBalances,
  getSimplifiedDebts,
  settleUp,
  getActivity,
} = require('../controllers/balanceController');

const router = express.Router();

router.use(protect); // every route below requires a logged-in user

router.post('/', createGroup);
router.get('/', listMyGroups);
router.get('/:id', requireGroupMember, getGroup);
router.post('/:id/members', requireGroupMember, addMember);

// Expenses (nested under a group)
router.post('/:groupId/expenses', requireGroupMember, addExpense);
router.get('/:groupId/expenses', requireGroupMember, listExpenses);
router.delete('/:groupId/expenses/:expenseId', requireGroupMember, deleteExpense);

// Balances / settlements
router.get('/:groupId/balances', requireGroupMember, getBalances);
router.get('/:groupId/simplify', requireGroupMember, getSimplifiedDebts);
router.post('/:groupId/settle', requireGroupMember, settleUp);
router.get('/:groupId/activity', requireGroupMember, getActivity);

module.exports = router;
