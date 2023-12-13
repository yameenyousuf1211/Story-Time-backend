const Joi = require('joi');

exports.createCategoryValidation = Joi.object({
    name: Joi.string().required(),
    parent: Joi.string(), // Assuming parent can be the ID of another category
  });
  