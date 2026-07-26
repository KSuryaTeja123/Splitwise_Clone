const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User belonging to this token no longer exists');
    }
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, 'Not authorized, token invalid or expired');
  }
});

// Ensures req.user is a member of the group referenced by req.params.groupId / req.body.group
const requireGroupMember = asyncHandler(async (req, res, next) => {
  const Group = require('../models/Group');
  const groupId = req.params.groupId || req.params.id || req.body.group;
  const group = await Group.findById(groupId);

  if (!group) throw new ApiError(404, 'Group not found');

  const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) throw new ApiError(403, 'You are not a member of this group');

  req.group = group;
  next();
});

module.exports = { protect, requireGroupMember };
