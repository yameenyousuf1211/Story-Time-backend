const { generateResponse, parseBody, } = require('../utils');
const { createStory, getAllStories, findStoryById } = require('../models/storyModel');
const { STATUS_CODES, STORY_TYPES } = require('../utils/constants');
const { createStoryValidation } = require('../validations/storyValidation');
const { getStoriesQuery, getUserStoriesQuery } = require('./queries/storyQueries');
const { Types } = require('mongoose');

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

// get a story by Id
exports.fetchStoryById = async (req, res, next) => {
    const { storyId } = req.params;

    // check if ID is valid
    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide storyId properly.'
    });

    try {
        const story = await findStoryById(storyId).populate('creator subCategory').lean();
        story.likesCount = story.likes.length;
        story.dislikesCount = story.dislikes.length;
        story.likedByMe = story.likes.includes(new Types.ObjectId(req.user.id));
        story.dislikesByMe = story.dislikes.includes(new Types.ObjectId(req.user.id));

        if (!story) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Story not found'
        });

        generateResponse(story, 'Story retrieved successfully', res);
    } catch (error) {
        next(error);
    }
}