const { generateResponse, parseBody, } = require('../utils');
const { createStory, getAllStories } = require('../models/storyModel');
const { STATUS_CODES, STORY_TYPES } = require('../utils/constants');
const { createStoryValidation } = require('../validations/storyValidation');
const { getStoriesQuery, getUserStoriesQuery } = require('./queries/storyQueries');

//Create Text Story
exports.createStory = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createStoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        // create story in db
        const story = await createStory(body);
        generateResponse(story, 'Story created successfully', res);
    } catch (error) {
        next(error)
    }
}

// get all stories
exports.fetchAllStories = async (req, res, next) => {
    const user = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const query = getStoriesQuery(user);

    try {
        const storiesData = await getAllStories({ query, page, limit });
        if (storiesData?.stories.length === 0) {
            generateResponse(null, 'No any story found', res);
            return;
        }

        generateResponse(storiesData, 'All stories retrieved successfully', res);
    } catch (error) {
        next(error);
    }
}

// get user's stories
exports.fetchUserStories = async (req, res, next) => {
    const user = req.query?.user || req.user.id;
    const type = req.query?.type || STORY_TYPES.TEXT;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;


    const query = getUserStoriesQuery(user, type);

    try {
        const storiesData = await getAllStories({ query, page, limit });
        if (storiesData?.stories.length === 0) {
            generateResponse(null, 'No any story found', res);
            return;
        }

        generateResponse(storiesData, 'All stories retrieved successfully', res);
    } catch (error) {
        next(error);
    }
}