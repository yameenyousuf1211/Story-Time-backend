const { findUser, getAllUsers, updateUser, createUser } = require('../models/userModel');
const { generateResponse, parseBody } = require('../utils/index');
const { STATUS_CODES, ROLES, } = require('../utils/constants');
const { getUsersQuery } = require('./queries/userQueries');
const { checkUsernameAvailabilityValidation } = require('../validations/userValidation');
const { Types } = require('mongoose');
const { addFollowing, findFollowing, deleteFollowing } = require('../models/followingModel');
const { hash } = require('bcrypt');

// check username availability
exports.usernameAvailability = async (req, res, next) => {
  const body = parseBody(req.body);

  // Joi validation
  const { error } = checkUsernameAvailabilityValidation.validate(body);
  if (error) return next({
    statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
    message: error.details[0].message
  });

  const { username } = body;

  try {
    const user = await findUser({ username, isDeleted: false });
    if (user) return next({
      statusCode: STATUS_CODES.CONFLICT,
      message: 'Username already exists'
    });
    generateResponse(null, 'Username available', res);
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
