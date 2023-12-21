const router = require('express').Router();
const { fetchAllStories, createStory } = require('../controllers/storyController');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class StoryAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.get('/', authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchAllStories);
        router.post('/', authMiddleware([ROLES.USER]), createStory);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/story';
    }
}

module.exports = StoryAPI;
