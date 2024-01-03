const { generateResponse, parseBody, } = require('../utils');
const { createStory, getAllStories, findStoryById, updateStoryById } = require('../models/storyModel');
const { STATUS_CODES, STORY_TYPES } = require('../utils/constants');
const { createStoryValidation, createCommentValidation } = require('../validations/storyValidation');
const { getStoriesQuery, getUserStoriesQuery } = require('./queries/storyQueries');
const { createComment, removeCommentById, getCommentById, getAllComments, updateCommentById, countComments } = require('../models/commentModel');
const { getAllUsers } = require('../models/userModel');
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

// like a story
exports.likeStoryToggle = async (req, res, next) => {
    const user = req.user.id;
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide valid storyId.'
    });

    try {
        const story = await findStoryById(storyId);
        if (!story) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Story not found'
        });

        // check if user has already liked
        if (story.likes.includes(user)) {
            story.likes.pull(user);
            await story.save();

            generateResponse(story, 'Story liked removed successfully', res);
            return;
        }

        // like the story
        story.likes.push(user);
        await story.save();

        generateResponse(story, 'Story liked successfully', res);
    } catch (error) {
        next(error);
    }
}

// dislike a story
exports.dislikeStoryToggle = async (req, res, next) => {
    const user = req.user.id;
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide valid storyId.'
    });

    try {
        const story = await findStoryById(storyId);
        if (!story) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Story not found'
        });

        // check if user has already liked
        if (story.dislikes.includes(user)) {
            story.dislikes.pull(user);
            await story.save();

            generateResponse(story, 'Story disliked removed successfully', res);
            return;
        }

        // like the story
        story.dislikes.push(user);
        await story.save();

        generateResponse(story, 'Story disliked successfully', res);
    } catch (error) {
        next(error);
    }
}

// add comment to post
exports.addCommentOnStory = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createCommentValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    body.user = req.user.id;

    if (req.files?.media?.length > 0) body.media = req.files.media.map(file => file.path);

    try {
        // if (req?.files?.media?.length > 0) body.media = await s3Uploadv3(req.files?.media);

        let comment = await createComment(body);

        // update parent comment
        if (body.parent) {
            await updateCommentById(body.parent, { $push: { replies: comment._id } });
        }
        await updateStoryById(body.story, { $inc: { commentsCount: 1 } });
        comment = await getCommentById(comment._id).populate('user', 'firstName lastName profileImage');
        generateResponse(comment, 'Comment created successfully', res);
    } catch (error) {
        next(error);
    }
}

// remove comment from post
exports.removeCommentOnPost = async (req, res, next) => {
    const userId = req.user.id;
    const { commentId } = req.params;

    try {
        // check userId is comment owner
        const commentObj = await getCommentById(commentId);
        if (!commentObj) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'comment not found',
        });


        if (userId !== commentObj.user.toString()) return next({
            statusCode: STATUS_CODES.FORBIDDEN,
            message: "You do not have permission to delete this comment.",
        });

        const deletedComment = await removeCommentById(commentId);
        await updateStoryById(commentObj.story, { $pull: { comments: commentId } });

        generateResponse(deletedComment, 'Comment deleted successfully', res);
    } catch (error) {
        next(error);
    }
}

// get story comments
exports.getCommentsOfStory = async (req, res, next) => {
    const { storyId } = req.params;

    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;

    if (!storyId || !Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide storyId properly.'
    });

    const query = { story: new Types.ObjectId(storyId), parent: null };   //getAllCommentsQuery(postId);

    try {
        const commentsData = await getAllComments({
            query, page, limit,
            populate: [
                { path: 'user', select: 'firstName lastName username profileImage' },
                {
                    path: 'replies',
                    populate: [
                        { path: 'user', select: 'firstName lastName username profileImage' },
                        {
                            path: 'replies',
                            // perDocumentLimit: 2,
                            populate: [
                                { path: 'user', select: 'firstName lastName username profileImage' },
                            ]
                        },
                    ]
                },
            ]
        });

        if (commentsData?.comments?.length === 0) {
            generateResponse(null, 'No comments found', res);
            return;
        }

        commentsData.commentsCount = await countComments({ story: new Types.ObjectId(storyId) });
        generateResponse(commentsData, 'Comments fetched successfully', res);
    } catch (error) {
        next(error);
    }
}

// tag or untag friend in a Story (toggle)
exports.tagFriendToggle = async (req, res, next) => {
    const user = req.user.id;
    const { storyId, taggedUserId } = parseBody(req.body);

    if (!Types.ObjectId.isValid(storyId) || !Types.ObjectId.isValid(taggedUserId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please provide valid storyId and taggedUserId.'
    });

    try {
        const story = await findStoryById(storyId);
        if (!story) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Story not found'
        });

        // check if the current user is the creator of the story
        if (!story.creator.equals(user)) return next({
            statusCode: STATUS_CODES.UNAUTHORIZED,
            message: 'Only the creator of the story can tag or untag friends.'
        });

        // check if the user is already tagged or not
        if (story.tag.includes(taggedUserId)) {
            story.tag.pull(taggedUserId);
            await story.save();
            generateResponse(story, 'User tag removed successfully from the story', res);
            return;
        }

        // tag the user in the story
        story.tag.push(taggedUserId);
        await story.save();

        generateResponse(story, 'User tagged Successfully for the story', res);
    } catch (error) {
        next(error);
    }
}