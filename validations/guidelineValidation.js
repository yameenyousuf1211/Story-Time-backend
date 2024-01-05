const Joi = require("joi");
const { GUIDELINE } = require("../utils/constants");

exports.addGuidelineValidation = Joi.object({
  type: Joi.string()
    .valid(...Object.values(GUIDELINE))
    .required(),
  content: Joi.string().required(),
  title: Joi.string().allow(null),
});

exports.getGuidelineValidation = Joi.object({
    type: Joi.string()
    .valid(...Object.values(GUIDELINE))
    .required(),
})
