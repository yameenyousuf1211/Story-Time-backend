const Joi = require('joi');

exports.createCategoryValidation = Joi.object({
  name: Joi.string().required(),
  parent: Joi.string(), // Assuming parent can be the ID of another category
  hexCode: Joi.string().regex(/^#[0-9a-fA-F]{6}$/).required(),
});

exports.updateCategoryValidation = Joi.object({
  name: Joi.string().required(),
  hexCode: Joi.string().allow(null, '').regex(/^#[0-9a-fA-F]{6}$/).messages({
    'string.pattern.base': 'hexCode is not valid.',
  }),
});

