const router = require('express').Router();
const {
    fetchAllStories,
    createStory,
    fetchUserStories,
    fetchStoryById,
    likeStoryToggle,
    dislikeStoryToggle,
    removeCommentOnPost,
    getCommentsOfStory,
    addCommentOnStory,
    tagFriendToggle,
    toggleStoryVisibility,
    shareStory
} = require('../controllers/storyController');
const authMiddleware = require('../middlewares/auth');
const { upload } = require('../utils');
const { ROLES } = require('../utils/constants');

class StoryAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.get('/', authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchAllStories);
        router.get('/user', authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchUserStories);
        router.get("/:storyId", authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchStoryById);
        router.get('/comments/:storyId', authMiddleware(Object.values(ROLES)), getCommentsOfStory);

        router.post('/', authMiddleware([ROLES.USER]), createStory);
        router.post('/add-comment', authMiddleware(Object.values(ROLES)), upload('comments').fields([{ name: "media", maxCount: 5 }]), addCommentOnStory);
        router.post('/share/:storyId', authMiddleware([ROLES.USER]), shareStory);

        router.put('/like/:storyId', authMiddleware([ROLES.USER]), likeStoryToggle);
        router.put('/dislike/:storyId', authMiddleware([ROLES.USER]), dislikeStoryToggle);
        router.put('/tag-friend', authMiddleware([ROLES.USER]), tagFriendToggle)
        router.put('/hide/:storyId', authMiddleware([ROLES.USER]), toggleStoryVisibility);

        router.delete('/remove-comment/:commentId', authMiddleware(Object.values(ROLES)), removeCommentOnPost);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/story';
    }
}

module.exports = StoryAPI;
