const { Router } = require('express');
const { createTextStory, createVideoStory } = require('../controllers/storyController');

class StoryAPI {
    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.post('/text-story', createTextStory);
        router.post('/video-story', createVideoStory);

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/';
    }
}

module.exports = StoryAPI;
