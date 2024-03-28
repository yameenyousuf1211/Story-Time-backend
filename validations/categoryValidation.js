const Joi = require('joi');

exports.createCategoryValidation = Joi.object({
  name: Joi.string().required(),
  parent: Joi.string(), // Assuming parent can be the ID of another category
  hexCode: Joi.string().regex(/^#[0-9a-fA-F]{6}$/).messages({
    'string.pattern.base': 'hexCode is not valid.',
  }).optional(),
});

exports.updateCategoryValidation = Joi.object({
  categoryId: Joi.string().required(),
  name: Joi.string(),
  hexCode: Joi.string().regex(/^#[0-9a-fA-F]{6}$/).messages({
    'string.pattern.base': 'hexCode is not valid.',
  }).optional(),
});

