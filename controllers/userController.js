const { findUser, getAllUsers, updateUser, createUser, addOrUpdateCard } = require('../models/userModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils/index');
const { STATUS_CODES, ROLES, } = require('../utils/constants');
const { getUsersQuery, getFriendsQuery, getBlockedUsersQuery, getAllUserQuery } = require('./queries/userQueries');
const { checkAvailabilityValidation, updateProfileValidation, notificationsToggleValidation, getAllUsersValidation, reportUserValidation, addCardValidation, getAllUsersForAdminValidation, editAdminInfoValidation } = require('../validations/userValidation');
const { Types } = require('mongoose');
const { addFollowing, findFollowing, deleteFollowing } = require('../models/followingModel');
const { hash } = require('bcrypt');
const { findBlockUser, unblockUser, blockUser, getBlockList } = require('../models/blockModel');
const { findStoryById } = require('../models/storyModel');
const { createReport, findReportById, findReports } = require('../models/reportModel');

// check username availability
exports.checkAvailability = async (req, res, next) => {
  const body = parseBody(req.body);

  // Joi validation
  const { error } = checkAvailabilityValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const key = body.username ? 'username' : body.email ? 'email' : 'completePhone';

  try {
    const user = await findUser({ [key]: body[key], role: ROLES.USER, isDeleted: false });
    if (user) return next({
      statusCode: STATUS_CODES.CONFLICT,
      message: `${key} already exists`
    });

    generateResponse(null, `${key} available`, res);
  } catch (error) {
    next(error);
  }
}

// get all users
exports.getAllUsers = async (req, res, next) => {

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

  try {
    const usersData = await getAllUsers({ query, page, limit });
    if (usersData?.users.length === 0) {
      generateResponse(null, 'No users found', res);
      return;
    }

    generateResponse(usersData, 'All users retrieved successfully', res);
  } catch (error) {
    next(error);
  }
}

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

// follow/unfollow
exports.followUnFollowToggle = async (req, res, next) => {
  const { following } = req.body;
  const user = req.user.id;

  if (!following || !Types.ObjectId.isValid(following)) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please, provide following properly.'
  });

  try {
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
  } catch (error) {
    next(error);
  }
}

// get all Friends
exports.getAllFriends = async (req, res, next) => {
  const user = req.user.id;
  const { search = "" } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getFriendsQuery(search, user);

  try {
    const usersData = await getAllUsers({ query, page, limit });
    if (usersData?.users.length === 0) {
      generateResponse(null, 'No Friends found', res);
      return;
    }

    generateResponse(usersData, 'All Friends retrieved successfully', res);
  } catch (error) {
    next(error);
  }
}

// update profile
exports.updateProfile = async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = updateProfileValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  body.completePhone = body.phoneCode + body.phoneNo;

  if (req.files) {
    body.profileImage = req.files['profileImage'] ? req.files['profileImage'][0].path : body.profileImage;
    body.coverImage = req.files['coverImage'] ? req.files['coverImage'][0].path : body.coverImage;
  }

  try {
    const user = await updateUser({ _id: userId }, { $set: body });
    generateResponse(user, 'Profile updated successfully', res);
  } catch (error) {
    next(error);
  }
}

// notification toggle
exports.notificationsToggle = async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = notificationsToggleValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const key = body.key;

  try {
    const user = await findUser({ _id: userId });

    // toggle the value
    user.settings[key] = !user.settings[key];

    // save notification toggle status
    await user.save();
    generateResponse(user, `${key} toggled successfully`, res);
  } catch (error) {
    next(error);
  }
};

// Block User Toggle
exports.blockToggle = async (req, res, next) => {
  const userId = req.user.id;
  const { blockId } = req.body;

  if (!blockId || !Types.ObjectId.isValid(blockId)) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: 'Please, provide valid blockId.'
  });

  try {
    const blockExist = await findBlockUser({ userId, blockId })
    if (blockExist) {
      const deletedObj = await unblockUser({ userId, blockId })
      if (deletedObj) {
        return generateResponse(blockExist, 'Unblock Successfully', res)
      }
    }

    const blockObj = await blockUser({ userId, blockId })
    generateResponse(blockObj, 'Blocked Successfully', res)
  } catch (error) {
    next(error)
  }
}

// get block list
exports.getBlockList = async (req, res, next) => {
  const user = req.user.id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const query = getBlockedUsersQuery(user);

  try {
    const blockedUsersObj = await getBlockList({ query, page, limit });
    if (blockedUsersObj?.blockUsers?.length === 0) {
      return generateResponse(null, 'No block list found', res);
    }

    generateResponse(blockedUsersObj, 'Block users retrieved successfully!', res);
  } catch (error) {
    next(error);
  }
};

//report user
exports.reportUser = async (req, res, next) => {
  const user = req.user.id;
  const body = parseBody(req.body);

  // Joi validation
  const { error } = reportUserValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  try {
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
  } catch (error) {
    next(error);
  }
}

exports.getAllReports = async (req, res, next) => {
  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 10;

  const query = {};
  try {

    const reportsList = await findReports({ query, page, limit });
    if (reportsList?.reports.length === 0) {
      generateResponse(null, 'No Reports found', res);
      return;
    }
    generateResponse(reportsList, "Reports found Successfully", res);
  } catch (error) {
    next(error)
  }
}

// delete user (soft delete)
exports.deleteUser = async (req, res, next) => {
  let user;

  if (req.user.role === ROLES.ADMIN) user = req.query?.user;
  else user = req.user.id;

  try {
    const userObj = await findUser({ _id: user, isDeleted: false });
    if (!userObj) return next({
      statusCode: STATUS_CODES.NOT_FOUND,
      message: 'User not found'
    });

    userObj.isDeleted = true;
    await userObj.save();

    generateResponse(userObj, 'User deleted successfully', res);
  } catch (error) {
    next(error);
  }
}

// get card details
exports.getCard = async (req, res, next) => {
  const user = req.user.id;

  try {
    const existingUser = await findUser({ _id: user });

    if (!existingUser.card) {
      return generateResponse(null, 'No card found for the user', res);
    }

    generateResponse(existingUser.card, 'Card details retrieved successfully', res);
  } catch (error) {
    next(error)
  }
}

// add or update card for payment
exports.addOrUpdateCard = async (req, res, next) => {
  const userId = req.user.id;
  const body = parseBody(req.body);

  // Joi validation
  const { error } = addCardValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  try {
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
  } catch (error) {
    next(error)
  }

}

// delete user card (hard delete)
exports.deleteCard = async (req, res, next) => {
  const user = req.user.id;
  try {
    const existingUser = await findUser({ _id: user });
    if (!existingUser.card) {
      return generateResponse(null, 'User Not Found', res);
    }

    existingUser.card = null;
    await existingUser.save();
    generateResponse(existingUser, 'Card deleted successfully', res);
  } catch (error) {
    next(error);
  }
}

// get all users
exports.getAllUsersForAdmin = async (req, res, next) => {
  const user = req.user.id;
  const { search = "", status } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getAllUserQuery(search, user, status);

  try {
    const usersData = await getAllUsers({ query, page, limit });
    if (usersData?.users.length === 0) {
      generateResponse(null, 'No users found', res);
      return;
    }

    generateResponse(usersData, 'All users retrieved successfully', res);
  } catch (error) {
    next(error);
  }
};

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

exports.editAdminInfo = asyncHandler(async (req, res, next) => {
  const body = parseBody(req.body);
  const userId = req.user.id;

  // Joi validation
  const { error } = editAdminInfoValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  // if password is provided, decrypt it
  body.decryptedPassword = body.password;

  // hash password
  const hashedPassword = await hash(body.password, 10);
  body.password = hashedPassword;

  const user = await updateUser({ _id: userId }, { $set: body });
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
      completePhone: '+921111111111',
      role: ROLES.ADMIN,
    });

    console.log('Admin default created successfully');
  } catch (error) {
    console.log(error);
  }
})();

