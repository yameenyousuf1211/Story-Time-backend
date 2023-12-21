const Joi = require('joi');

exports.checkUsernameAvailabilityValidation = Joi.object({
    username: Joi.string().min(3).max(20).required(),
  });