const router = require('express').Router();
const {
    getChatList,
    closeChat,
    sendMessage,
    getChatMessages,
    markMessagesAsRead
} = require('../controllers/supportController');
const authMiddleware = require('../middlewares/auth');
const { upload } = require('../utils');
const { ROLES } = require('../utils/constants');
//const { upload } = require("../utils/s3Upload");

class SupportAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {

        router.get('/chat-list', authMiddleware(Object.values(ROLES)), getChatList);
        router.get('/:chatId', authMiddleware(Object.values(ROLES)), getChatMessages);

        router.post('/send-message',
            authMiddleware(Object.values(ROLES)),
            upload('chat').fields([{ name: "media", maxCount: 5 }]), sendMessage);

        router.put('/close-ticket', authMiddleware(Object.values(ROLES)), closeChat);
        router.put('/message-read/:chatId', authMiddleware(Object.values(ROLES)), markMessagesAsRead);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/support';
    }
}

module.exports = SupportAPI;
