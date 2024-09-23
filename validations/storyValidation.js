const Joi = require('joi');
const { STORY_TYPES } = require('../utils/constants');

// create story validation
exports.createStoryValidation = Joi.object({
    type: Joi.string().valid(...Object.values(STORY_TYPES)).required(),
    category: Joi.string().required(),
    subCategory: Joi.string().required(),
    creator: Joi.string().required(),
    contributors: Joi.array().items(Joi.string()).optional(),
    content: Joi.string().required(),
    video: Joi.string().when('type', {
        is: STORY_TYPES.VIDEO,
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
    }),
    thumbnail: Joi.string().when('type', {
        is: STORY_TYPES.VIDEO,
        then: Joi.string().optional(),
        otherwise: Joi.forbidden()
    }),
});

exports.createCommentValidation = Joi.object({
    story: Joi.string().required(),
    parent: Joi.string().trim().optional(),
    text: Joi.string().trim().required(),
});