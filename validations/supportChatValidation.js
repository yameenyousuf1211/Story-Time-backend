const Joi = require("joi");

exports.sendMessageValidation = Joi.object({
  text: Joi.string().required(),
  chat: Joi.string(),
});
