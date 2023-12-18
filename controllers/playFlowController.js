const { generateResponse, parseBody, } = require('../utils');
const { createStory } = require('../models/playFlowModel');
const { STATUS_CODES, ROLES } = require('../utils/constants');
const { createTextStoryValidation, createVideoStoryValidation } = require('../validations/playFlowValidation');

//Create Text Story
exports.createTextStory = async (req, res, next) => {
    console.log("req.body:",req.body);
    const body = parseBody(req.body);
    
    // Joi validation
    const { error } = createTextStoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        // create story in db
        let story = await createStory(body);

        generateResponse({ story }, 'Story Created', res);

    } catch (error) {
        next(error)
    }
}

// Create Video Story
exports.createVideoStory = async (req, res, next) => {
    console.log("req.body:",req.body);
    const body = parseBody(req.body);
    
    // Joi validation
    const { error } = createVideoStoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });
    

    try {
        // create story in db
        let story = await createStory(body);

        generateResponse({ story }, 'Story Created', res);

    } catch (error) {
        next(error)
    }
}