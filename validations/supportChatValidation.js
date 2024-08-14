const Joi = require("joi");

exports.sendMessageValidation = Joi.object({
  chat: Joi.string().required(),
  text: Joi.string().allow(null, ''),
  media: Joi.any(),
})