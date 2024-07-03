const router = require('express').Router();
const {
    closeChat,
    uploadMedia
} = require('../controllers/supportController');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');
const { upload } = require("../utils/s3Upload");

class SupportAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        // router.get('/chat-list', authMiddleware(Object.values(ROLES)), getChatList);
        // router.get('/:chat', authMiddleware(Object.values(ROLES)), getChatMessages);

        // router.post('/send-message',
        //     authMiddleware(Object.values(ROLES)),
        //     upload('chat').fields([{ name: "media", maxCount: 5 }]), sendMessage);

        router.post('/upload-media', upload.fields([{ name: "media", maxCount: 5 }]), uploadMedia);

        router.put('/close-ticket', authMiddleware(Object.values(ROLES)), closeChat);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/support';
    }
}

module.exports = SupportAPI;
