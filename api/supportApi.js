const router = require('express').Router();
const {
    getChatList,
    closeChat,
    sendMessage
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
        // router.get('/', authMiddleware(Object.values(ROLES)), getMessages);

        router.post('/send-message',
            authMiddleware(Object.values(ROLES)),
            upload('chat').fields([{ name: "media", maxCount: 5 }]), sendMessage);
        //  upload.fields([{ name: "media", maxCount: 5 }]), sendMessage);

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
