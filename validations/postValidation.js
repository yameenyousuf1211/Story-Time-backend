const Joi = require('joi');

exports.createTextStoryValidation = Joi.object({
    type: Joi.string().required(),
    creator: Joi.string().required(),
    contributors: Joi.array().optional(),
    content: Joi.string().required(),
    likes: Joi.string(),
    dislikes: Joi.string(),
});

exports.createVideoStoryValidation = Joi.object({
    type: Joi.string().required(),
    creator: Joi.string().required(),
    contributors: Joi.array().optional(),
    category: Joi.string().required(),
    likes: Joi.string(),
    dislikes: Joi.string()
})
