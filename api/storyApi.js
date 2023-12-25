const router = require('express').Router();
const {
    fetchAllStories,
    createStory,
    fetchUserStories,
    fetchStoryById,
    likeStoryToggle,
    dislikeStoryToggle
} = require('../controllers/storyController');
const authMiddleware = require('../middlewares/auth');
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

        router.post('/', authMiddleware([ROLES.USER]), createStory);

        router.put('/like/:storyId', authMiddleware([ROLES.USER]), likeStoryToggle);
        router.put('/dislike/:storyId', authMiddleware([ROLES.USER]), dislikeStoryToggle);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/story';
    }
}

module.exports = StoryAPI;
