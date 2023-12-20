const { Router } = require('express');
const { createStory, createTextStory, createVideoStory } = require('../controllers/postController');
const { upload } = require('../utils');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');
const { createVideoStoryValidation } = require('../validations/postValidation');

class PlayFlowAPI {
    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    setupRoutes() {
        let router = this.router;
        router.post('/text-story', createTextStory);
        router.post('/video-story',  createVideoStory);

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/';
    }
}

module.exports = PlayFlowAPI;
