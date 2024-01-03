const Joi = require('joi');
const { STORY_TYPES } = require('../utils/constants');

// create story validation
exports.createStoryValidation = Joi.object({
    type: Joi.string().valid(...Object.values(STORY_TYPES)).required(),
    category: Joi.string().required(),
    subCategory: Joi.string().required(),
    creator: Joi.string().required(),
    contributors: Joi.array().items(Joi.string()).required(),
    content: Joi.string().required(),
});

exports.createCommentValidation = Joi.object({
    story: Joi.string().required(),
    parent: Joi.string().trim().optional(),
    text: Joi.string().trim().required(),
});