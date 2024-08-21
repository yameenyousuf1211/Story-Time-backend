const { findUser, getAllUsers, updateUser, createUser, addOrUpdateCard, getUsers, createOrUpdateGuestCount, getGuestCount, getUserCount, aggregateDocumentCount, getPremiumNonPremiumCount, createGuest, findGuest } = require('../models/userModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils/index');
const { STATUS_CODES, ROLES, } = require('../utils/constants');
const { getUsersQuery, getFriendsQuery, getBlockedUsersQuery, getAllUserQuery } = require('./queries/userQueries');
const { checkAvailabilityValidation, updateProfileValidation, notificationsToggleValidation, getAllUsersValidation, reportUserValidation, addCardValidation, getAllUsersForAdminValidation, editAdminInfoValidation, checkAllAvailabilityValidation, subscribeUserValidatiion } = require('../validations/userValidation');
const { Types } = require('mongoose');
const { addFollowing, findFollowing, deleteFollowing } = require('../models/followingModel');
const { hash } = require('bcrypt');
const { findBlockUser, unblockUser, blockUser, getBlockList } = require('../models/blockModel');
const { findStoryById } = require('../models/storyModel');
const { createReport, findReportById, findReports } = require('../models/reportModel');
const { s3Uploadv3 } = require('../utils/s3Upload');

// check username availability
exports.checkAvailability = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);

  // Joi validation
  const { error } = checkAvailabilityValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const key = body.username ? 'username' : body.email ? 'email' : null;

  const user = await findUser({ [key]: body[key] });
  if (user) return next({
    statusCode: STATUS_CODES.CONFLICT,
    message: `${key} already exists`
  });

  generateResponse(null, `${key} available`, res);
});

exports.checkAllAvailability = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);

  // Joi validation
  const { error } = checkAllAvailabilityValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const checkPromises = [];

  if (body.username) checkPromises.push({ check: findUser({ username: body.username }), field: 'username' });
  if (body.email) checkPromises.push({ check: findUser({ email: body.email }), field: 'email' });

  if (checkPromises.length === 0) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please provide at least one field to check'
  });

  const results = await Promise.all(checkPromises.map(p => p.check));
  const response = [];

  results.forEach((result, index) => {
    if (result) {
      response.push({ [checkPromises[index].field]: `${checkPromises[index].field} already exists` });
    }
  });

  if (response.length > 0) {
    return generateResponse(response, 'Conflicts found', res);
  }

  generateResponse(null, 'All available', res);
});

// get all users
exports.getAllUsers = asyncHandler(async (req, res, next) => {

  // Joi validation
  const { error } = getAllUsersValidation.validate(req.query);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const user = req.user.id;
  const { search = "", story } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getUsersQuery(search, user, story);

  const usersData = await getAllUsers({ query, page, limit });
  if (usersData?.users.length === 0) {
    generateResponse(null, 'No users found', res);
    return;
  }

  generateResponse(usersData, 'All users retrieved successfully', res);
});

// get user by id
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = req.query?.user || req.user.id;

  const userObj = await findUser({ _id: user }).select('+decryptedPassword');

  // if user not found return error
  if (!userObj) return next({
    statusCode: STATUS_CODES.NOT_FOUND,
    message: 'User profile not found!'
  });

  generateResponse(userObj, 'Profile found!', res);
});

// follow/unFollow
exports.followUnFollowToggle = asyncHandler(async (req, res, next) => {
  const { following } = req.body;
  const user = req.user.id;

  if (!following || !Types.ObjectId.isValid(following)) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please, provide following properly.'
  });

  const userExist = await findUser({ _id: following });
  if (!userExist) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'User not found'
  });

  const followingExist = await findFollowing({ user, following });
  if (followingExist) {
    const deletedObj = await deleteFollowing({ user, following });
    if (deletedObj) {
      // when unfollowing a user, decrement noOfFollowings and noOfFollowers of both users
      await updateUser({ _id: user }, { $inc: { noOfFollowings: -1 } });
      await updateUser({ _id: following }, { $inc: { noOfFollowers: -1 } });
      generateResponse(null, 'Un-followed successfully', res);
      return;
    }
  }

  const followingObj = await addFollowing({ user, following });
  await updateUser({ _id: user }, { $inc: { noOfFollowings: 1 } });
  await updateUser({ _id: following }, { $inc: { noOfFollowers: 1 } });

  generateResponse(followingObj, 'Follow successfully!', res);
});

// get all Friends
exports.getAllFriends = asyncHandler(async (req, res, next) => {
  const user = req.user.id;
  const { search = "" } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getFriendsQuery(search, user);

  const usersData = await getAllUsers({ query, page, limit });
  if (usersData?.users.length === 0) {
    generateResponse(null, 'No Friends found', res);
    return;
  }

  generateResponse(usersData, 'All Friends retrieved successfully', res);
});

// update profile
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = updateProfileValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  // upload images to s3
  if (req?.files?.profileImage?.length > 0) [body.profileImage] = await s3Uploadv3(req.files?.profileImage);
  if (req?.files?.coverImage?.length > 0) [body.coverImage] = await s3Uploadv3(req.files?.coverImage);

  const user = await updateUser({ _id: userId }, { $set: body });
  generateResponse(user, 'Profile updated successfully', res);
});

// notification toggle
exports.notificationsToggle = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = notificationsToggleValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const key = body.key;

  const user = await findUser({ _id: userId });

  // toggle the value
  user.settings[key] = !user.settings[key];

  // save notification toggle status
  await user.save();
  generateResponse(user, `${key} toggled successfully`, res);
});

// Block User Toggle
exports.blockToggle = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { blockId } = req.body;

  if (!blockId || !Types.ObjectId.isValid(blockId)) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please, provide valid blockId.'
  });

  const blockExist = await findBlockUser({ userId, blockId })
  if (blockExist) {
    const deletedObj = await unblockUser({ userId, blockId })
    if (deletedObj) {
      return generateResponse(blockExist, 'Unblock Successfully', res)
    }
  }

  const blockObj = await blockUser({ userId, blockId })
  // Check if userId is following blockId
  const isFollowing = await findFollowing({ user: userId, following: blockId });

  if (isFollowing) {
    // If userId is following blockId, delete the following and update the counts
    await deleteFollowing({ user: userId, following: blockId });
    await updateUser({ _id: userId }, { $inc: { noOfFollowings: -1 } });
    await updateUser({ _id: blockId }, { $inc: { noOfFollowers: -1 } });
  }
  generateResponse(blockObj, 'Blocked Successfully', res)
});

// get block list
exports.getBlockList = asyncHandler(async (req, res, next) => {
  const user = req.user.id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const query = getBlockedUsersQuery(user);

  const blockedUsersObj = await getBlockList({ query, page, limit });
  if (blockedUsersObj?.blockUsers?.length === 0) {
    return generateResponse(null, 'No block list found', res);
  }

  generateResponse(blockedUsersObj, 'Block users retrieved successfully!', res);
});

//report user
exports.reportUser = asyncHandler(async (req, res, next) => {
  const user = req.user.id;
  const body = parseBody(req.body);

  // Joi validation
  const { error } = reportUserValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const story = await findStoryById(body.story);
  if (!story) return next({
    statusCode: STATUS_CODES.NOT_FOUND,
    message: 'Story not found',
  });

  // Create a report for the creator of the story
  const report = await createReport({
    user: user,
    reportedUser: story.creator,
    story: body.story,
    text: body.text,
  });

  const populatedReport = await findReportById(report._id)
    .populate('user', 'firstName lastName username profileImage')
    .populate('reportedUser', 'firstName lastName username profileImage');

  generateResponse(populatedReport, 'Report submitted successfully!', res);
});

exports.getAllReports = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 10;

  const query = {};

  const reportsList = await findReports({ query, page, limit });
  if (reportsList?.reports.length === 0) {
    generateResponse(null, 'No Reports found', res);
    return;
  }
  generateResponse(reportsList, "Reports found Successfully", res);
});

// delete user (soft delete)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  let user;

  if (req.user.role === ROLES.ADMIN) user = req.query?.user;
  else user = req.user.id;

  const userObj = await findUser({ _id: user, isDeleted: false });
  if (!userObj) return next({
    statusCode: STATUS_CODES.NOT_FOUND,
    message: 'User not found'
  });

  userObj.isDeleted = true;
  await userObj.save();

  generateResponse(userObj, 'User deleted successfully', res);
});

// get card details
exports.getCard = asyncHandler(async (req, res, next) => {
  const user = req.user.id;

  const existingUser = await findUser({ _id: user });
  if (!existingUser.card) {
    return generateResponse(null, 'No card found for the user', res);
  }

  generateResponse(existingUser.card, 'Card details retrieved successfully', res);
});

// add or update card for payment
exports.addOrUpdateCard = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const body = parseBody(req.body);

  // Joi validation
  const { error } = addCardValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const existingUser = await findUser({ _id: userId });

  if (existingUser.card) {
    // Update existing card
    const updatedUser = await addOrUpdateCard({ _id: userId }, { $set: { 'card': body } });
    generateResponse(updatedUser, 'Card Saved successfully', res);
  } else {
    // Add new card
    const updatedUser = await addOrUpdateCard({ _id: userId }, { $set: { 'card': body } }, { new: true, upsert: true });
    generateResponse(updatedUser, 'Card Added successfully', res);
  }
});

// delete user card (hard delete)
exports.deleteCard = asyncHandler(async (req, res, next) => {
  const user = req.user.id;

  const existingUser = await findUser({ _id: user });
  if (!existingUser.card) {
    return generateResponse(null, 'User Not Found', res);
  }

  existingUser.card = null;
  await existingUser.save();
  generateResponse(existingUser, 'Card deleted successfully', res);
});

// get all users
exports.getAllUsersForAdmin = asyncHandler(async (req, res, next) => {
  const user = req.user.id;
  const { search = "", status } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getAllUserQuery(search, user, status);

  const usersData = await getAllUsers({ query, page, limit });
  if (usersData?.users.length === 0) {
    generateResponse(null, 'No users found', res);
    return;
  }

  generateResponse(usersData, 'All users retrieved successfully', res);
});

// toggle user status (active/inactive)
exports.userStatusToggle = asyncHandler(async (req, res, next) => {
  const { userId } = req.query;

  if (!userId || !Types.ObjectId.isValid(userId)) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please, provide valid userId.'
  });

  const userObj = await findUser({ _id: userId, isDeleted: false });

  if (!userObj) return next({
    statusCode: STATUS_CODES.NOT_FOUND,
    message: 'User not found'
  });

  userObj.isActive = !userObj.isActive;
  await userObj.save();

  const message = userObj.isActive ? 'User enabled successfully' : 'User disabled successfully';
  generateResponse(userObj, message, res);
});

// edit admin info
exports.editAdminInfo = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = editAdminInfoValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  let user = await findUser({ _id: userId });

  const userWithEmail = await findUser({ email: body.email, _id: { $ne: userId } });
  if (userWithEmail) return next({
    statusCode: STATUS_CODES.CONFLICT,
    message: 'Email already exists'
  });

  // if password is provided, decrypt it
  body.decryptedPassword = body.password;

  // hash password
  const hashedPassword = await hash(body.password, 10);
  body.password = hashedPassword;

  user = await updateUser({ _id: userId }, { $set: body });
  generateResponse(user, 'Profile updated successfully', res);
});

// toggle user profile mode (public/private)  
exports.toggleUserProfileMode = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const user = await findUser({ _id: userId });

  user.isPublic = !user.isPublic;
  await user.save();

  const message = user.isPublic ? 'Profile is now public' : 'Profile is now private';
  generateResponse(user, message, res);
});

// update guest count
exports.createGuestUser = asyncHandler(async (req, res, next) => {
  const { fcmToken } = req.body;

  // Check if the guest user exists by their fcmToken
  let guestUser = await findGuest({ fcmToken });

  if (guestUser) {
    return generateResponse(guestUser, 'Guest count updated successfully', res);
  }

  // Get the count of guest users to generate the next guest ID
  const guestCount = await getGuestCount();
  const nextGuestId = guestCount + 1;

  // Create a new guest user with the next guest ID
  guestUser = await createGuest({ guestId: nextGuestId, fcmToken });

  return generateResponse(guestUser, 'Guest count updated successfully', res);
});

// get total guest and user count
exports.getGuestAndUserCount = asyncHandler(async (req, res, next) => {
  const [guestCount, countResponse] = await Promise.all([
    getGuestCount(),
    getPremiumNonPremiumCount(),
  ]);

  const { premiumUsersCount, nonPremiumUsersCount } = countResponse;

  const response = {
    guestCount,
    premiumUsersCount,
    nonPremiumUsersCount,
  };
  generateResponse(response, 'Total Guest and User Count', res);
});



exports.subscribeUser = asyncHandler(async (req, res, next) => {
  const { email, status } = req.body;

  // Joi validation
  const { error } = subscribeUserValidatiion.validate(req.body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const user = await findUser({ email });

  user.isSubscribed = status;
  await user.save();

  const message = status ? 'User subscribed successfully' : 'User unsubscribed successfully';
  generateResponse(user, message, res);
});

// create default admin account
(async function createDefaultAdminAccount() {
  try {
    const userExist = await findUser({
      email: process.env.ADMIN_EMAIL,
      role: ROLES.ADMIN,
    });

    if (userExist) {
      console.log('admin exists -> ', userExist.email);
      return
    };

    console.log('admin not exist');
    const password = await hash(process.env.ADMIN_PASSWORD, 10);

    // create default admin
    await createUser({
      email: process.env.ADMIN_EMAIL,
      password,
      firstName: 'Admin',
      username: 'admin',
      role: ROLES.ADMIN,
    });

    console.log('Admin default created successfully');
  } catch (error) {
    console.log(error);
  }
})();
