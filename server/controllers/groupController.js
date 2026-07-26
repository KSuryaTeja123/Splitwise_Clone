const Group = require('../models/Group');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// @route POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, memberEmails = [] } = req.body;
  if (!name) throw new ApiError(400, 'Group name is required');

  const memberUsers = await User.find({ email: { $in: memberEmails.map((e) => e.toLowerCase()) } });
  const memberIds = new Set(memberUsers.map((u) => u._id.toString()));
  memberIds.add(req.user._id.toString()); // creator is always a member

  const group = await Group.create({
    name,
    members: Array.from(memberIds),
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, group });
});

// @route GET /api/groups  (all groups the logged-in user belongs to)
const listMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate('members', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, groups });
});

// @route GET /api/groups/:id
const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate('members', 'name email');
  if (!group) throw new ApiError(404, 'Group not found');
  res.status(200).json({ success: true, group });
});

// @route POST /api/groups/:id/members
const addMember = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(404, 'No user found with that email');

  const group = req.group; // set by requireGroupMember middleware
  if (group.members.some((m) => m.toString() === user._id.toString())) {
    throw new ApiError(409, 'User is already a member of this group');
  }

  group.members.push(user._id);
  await group.save();

  const populated = await group.populate('members', 'name email');
  res.status(200).json({ success: true, group: populated });
});

module.exports = { createGroup, listMyGroups, getGroup, addMember };
