const { generateResponse, parseBody, asyncHandler, } = require('../utils');
const { createStory, getAllStories, findStoryById, updateStoryById } = require('../models/storyModel');
const { STATUS_CODES, STORY_TYPES, NOTIFICATION_TYPES } = require('../utils/constants');
const { createStoryValidation, createCommentValidation } = require('../validations/storyValidation');
const { getStoriesQuery, getUserStoriesQuery, fetchHiddenStoriesQuery } = require('./queries/storyQueries');
const { createComment, removeCommentById, getCommentById, getAllComments, updateCommentById, countComments } = require('../models/commentModel');
const { Types } = require('mongoose');
const { s3Uploadv3 } = require('../utils/s3Upload');
const { createAndSendNotification } = require('../models/notificationModel');

//Create Text Story
exports.createStory = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createStoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    // create story in db
    const story = await createStory(body);
    generateResponse(story, 'Story created successfully', res);
});

// get all stories
exports.fetchAllStories = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const query = getStoriesQuery(user);

    const storiesData = await getAllStories({ query, page, limit });
    if (storiesData?.stories?.length === 0) {
        generateResponse(null, 'No any story found', res);
        return;
    }

    generateResponse(storiesData, 'All stories retrieved successfully', res);
});

// get user's stories
exports.fetchUserStories = asyncHandler(async (req, res, next) => {
    const user = req.query?.user || req.user.id;
    const type = req.query?.type || STORY_TYPES.TEXT;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const query = getUserStoriesQuery(user, type);

    const storiesData = await getAllStories({ query, page, limit });
    if (storiesData?.stories.length === 0) {
        generateResponse(null, 'No stories found', res);
        return;
    }

    generateResponse(storiesData, 'All stories retrieved successfully', res);
});

exports.fetchHiddenStories = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const type = req.query?.type || STORY_TYPES.TEXT;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const query = fetchHiddenStoriesQuery(user, type);

    const storiesData = await getAllStories({ query, page, limit });
    if (storiesData?.stories.length === 0) {
        generateResponse(null, 'No hidden stories found', res);
        return;
    }

    generateResponse(storiesData, 'Hidden stories retrieved successfully', res);
});

// get a story by Id
exports.fetchStoryById = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;

    // check if ID is valid
    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide storyId properly.'
    });

    const story = await findStoryById(storyId).populate('creator subCategory').lean();
    story.likesCount = story.likes.length;
    story.dislikesCount = story.dislikes.length;
    story.likedByMe = story.likes.map(id => id.toString()).includes(req.user.id);
    story.dislikesByMe = story.dislikes.map(id => id.toString()).includes(req.user.id);

    if (!story) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Story not found'
    });

    generateResponse(story, 'Story retrieved successfully', res);
});

// like a story
exports.likeStoryToggle = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide valid storyId.'
    });

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

    const contributorsToNotify = story.contributors.filter(contributor =>
        contributor.toString() !== user.toString()
    );

    await Promise.all(contributorsToNotify.map(contributorId =>
        createAndSendNotification({
            senderId: user,
            receiverId: contributorId,
            type: NOTIFICATION_TYPES.LIKE_POST,
            story: story.id
        })
    ));
    generateResponse(story, 'Story liked successfully', res);
});

// dislike a story
exports.dislikeStoryToggle = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide valid storyId.'
    });

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
});

// add comment to post
exports.addCommentOnStory = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createCommentValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    body.user = req.user.id;

    // upload media to s3
    if (req.files?.media?.length > 0) body.media = await s3Uploadv3(req.files.media);

    const story = await findStoryById(body.story);
    if (!story) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Story not found'
    });

    let comment = await createComment(body);

    // update parent comment
    if (body.parent) {
        await updateCommentById(body.parent, { $push: { replies: comment._id } });
    }
    await updateStoryById(body.story, { $inc: { commentsCount: 1 } });
    comment = await getCommentById(comment._id).populate('user', 'firstName lastName profileImage');

    const contributorsToNotify = story.contributors.filter(contributor =>
        contributor.toString() !== req.user.id.toString()
    );
    await Promise.all(contributorsToNotify.map(contributorId =>
        createAndSendNotification({
            senderId: req.user.id,
            receiverId: contributorId,
            type: NOTIFICATION_TYPES.COMMENT,
            story: story._id
        })
    ));
    generateResponse(comment, 'Comment created successfully', res);
});

// remove comment from post
exports.removeCommentOnPost = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { commentId } = req.params;

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
});

// get story comments
exports.getCommentsOfStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;

    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid storyId.'
    });

    const query = { story: new Types.ObjectId(storyId), parent: null };

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
});

// tag or untag friend in a Story (toggle)
exports.tagFriendToggle = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const { storyId, taggedUserId } = parseBody(req.body);

    if (!Types.ObjectId.isValid(storyId) || !Types.ObjectId.isValid(taggedUserId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please provide valid storyId and taggedUserId.'
    });

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
});

// toggle isHidden field of a story
exports.toggleStoryVisibility = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid storyId'
    });

    const story = await findStoryById(storyId);
    if (!story) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Story not found'
    });

    // check if the current user is the contributor of the story
    if (!story.contributors.find(contributor => contributor.toString() == user)) return next({
        statusCode: STATUS_CODES.UNAUTHORIZED,
        message: 'Only the contributor of the story can change the visibility.'
    });

    // toggle the visibility for the current user
    if (story.hiddenBy.includes(user)) {
        // If the story is already hidden from the user, unhide it
        story.hiddenBy = story.hiddenBy.filter(id => id.toString() !== user);
    } else {
        // If the story is not hidden from the user, hide it
        story.hiddenBy.push(user);
    }
    await story.save();

    generateResponse(story, 'Story visibility changed successfully', res);
});

exports.shareStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;
    const userId = req.user.id;

    if (!Types.ObjectId.isValid(storyId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid storyId'
    });

    const story = await findStoryById(storyId);
    if (!story) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Story not found'
    });

    const newStory = await createStory({
        type: story.type,
        creator: story.creator,
        contributors: [...story.contributors],
        content: story.content,
        category: story.category,
        subCategory: story.subCategory,
        sharedBy: userId,
    });

    const contributorsToNotify = story.contributors.filter(contributor => contributor.toString() !== userId.toString());

    await Promise.all(contributorsToNotify.map(contributorId =>
        createAndSendNotification({
            senderId: userId,
            receiverId: contributorId,
            type: NOTIFICATION_TYPES.SHARE_POST,
            story: newStory.id
        })
    ));
    generateResponse(newStory, 'Story shared successfully', res);
});

