const Joi = require("joi");
const { GUIDELINE } = require("../utils/constants");

exports.addGuidelineValidation = Joi.object({
  type: Joi.string()
    .valid(...Object.values(GUIDELINE))
    .required(),
  content: Joi.string().required(),
  title: Joi.string().allow(null, ""),
  _id: Joi.string().when('type', {
    is: GUIDELINE.FAQS,
    then: Joi.when('_id', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    otherwise: Joi.optional()
  })
});

exports.getGuidelineValidation = Joi.object({
  type: Joi.string()
    .valid(...Object.values(GUIDELINE))
    .required(),
})
