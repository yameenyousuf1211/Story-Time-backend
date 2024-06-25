const Joi = require("joi");
const { GUIDELINE } = require("../utils/constants");

exports.addGuidelineValidation = Joi.object({
  type: Joi.string().valid(...Object.values(GUIDELINE)).required(),
  content: Joi.string().required(),
  faqId: Joi.string(),
});

exports.getGuidelineValidation = Joi.object({
  type: Joi.string().valid(...Object.values(GUIDELINE)).required(),
})
