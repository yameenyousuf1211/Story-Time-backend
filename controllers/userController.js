const { findUser, getAllUsers, updateUser, createUser } = require('../models/userModel');
const { generateResponse, parseBody } = require('../utils/index');
const { STATUS_CODES, ROLES, } = require('../utils/constants');
const { getUsersQuery, getFriendsQuery, getBlockedUsersQuery } = require('./queries/userQueries');
const { checkAvailabilityValidation, updateProfileValidation, notificationsToggleValidation } = require('../validations/userValidation');
const { Types } = require('mongoose');
const { addFollowing, findFollowing, deleteFollowing } = require('../models/followingModel');
const { hash } = require('bcrypt');
const { findBlockUser, unblockUser, blockUser, getBlockList, findBlockedUsers } = require('../models/blockModel');

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
  const user = req.user.id;
  const { search = "" } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getUsersQuery(search, user);

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
exports.getUserProfile = async (req, res, next) => {
  const user = req.query?.user || req.user.id;

  try {
    const userObj = await findUser({ _id: user });
    // if user not found return error
    if (!userObj) return next({
      statusCode: STATUS_CODES.NOT_FOUND,
      message: 'User profile not found!'
    });

    generateResponse(userObj, 'Profile found!', res);
  } catch (error) {
    next(error);
  }
}

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
    // uploading to s3
    //  if (req?.files?.profileImage?.length > 0) [body.profileImage] = await s3Uploadv3(req.files?.profileImage);
    //  if (req?.files?.coverImage?.length > 0) [body.coverImage] = await s3Uploadv3(req.files?.coverImage);


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

  if (!blockId) return next({
    statusCode: STATUS_CODES.BAD_REQUEST,
    message: 'User Id is required'
  })
  try {
    const blockExist = await findBlockUser({ userId, blockId })
    if (blockExist) {
      const deletedObj = await unblockUser({ userId, blockId })
      if (deletedObj) {
        return generateResponse(blockExist, 'Unblock Successfully', res)
      }
    }

    const blockObj = await blockUser({ userId, blockId })
    if (blockObj) {
      generateResponse(blockObj, 'Blocked Successfully', res)
    }

  } catch (error) {
    next(error)
  }
}

// get block list
exports.getBlockList = async (req, res, next) => {
  const user = req.user.id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  try {
    const blockedUsers = await findBlockedUsers({ user });
    const blockedUserIds = blockedUsers.map(user => user.blockId);

    const query = getBlockedUsersQuery(user, blockedUserIds);

    const blockList = await getBlockList({ query, page, limit });
    if (blockList?.blocksList.length === 0) return next({
      statusCode: STATUS_CODES.NOT_FOUND,
      message: "Block list not found",
    });

    generateResponse(blockList, 'Block list retrieved Successfully', res);
  } catch (error) {
    next(error);
  }
};


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
      role: ROLES.ADMIN,
    });

    console.log('Admin default created successfully');
  } catch (error) {
    console.log(error);
  }
})();

