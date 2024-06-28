const router = require('express').Router();
const {
    getChatList,
    closeChat,
    sendMessage,
    getChatMessages,
    uploadMedia,
} = require('../controllers/supportController');
const authMiddleware = require('../middlewares/auth');
const { upload } = require('../utils');
const { ROLES } = require('../utils/constants');

class SupportAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get('/chat-list', authMiddleware(Object.values(ROLES)), getChatList);
        router.get('/:chat', authMiddleware(Object.values(ROLES)), getChatMessages);

        router.post('/send-message',
            authMiddleware(Object.values(ROLES)),
            upload('chat').fields([{ name: "media", maxCount: 5 }]), sendMessage);

        router.post('/upload-media', upload('chat').fields([{ name: "media", maxCount: 5 }]), uploadMedia);

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
