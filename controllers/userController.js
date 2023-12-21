const { findUser, getAllUsers } = require('../models/userModel');
const { generateResponse, parseBody } = require('../utils/index');
const { STATUS_CODES,  } = require('../utils/constants');
const { getUsersQuery } = require('./queries/userQueries');
const { checkUsernameAvailabilityValidation } = require('../validations/userValidation');

// exports.findMembers = async (req, res, next) => {
//   const body = parseBody(req.body);

//   // Joi Validation
//   const { error } = findMembersValidation.validate(body)
//   if (error) return next({
//     statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
//     message: error.details[0].message,
//   });

//   try {
//     const { search } = body;
//     const user = await findMembers({ username: body?.search, isDeleted: false });
//     if (!user) {
//       return next({
//         statusCode: STATUS_CODES.NOT_FOUND,
//         message: 'User not found',
//       });
//     }

//     generateResponse(user, 'User found successfully', res);
//   } catch (error) {
//     next(error);
//   }
// };

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
  const { search = "" } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const query = getUsersQuery(search);

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