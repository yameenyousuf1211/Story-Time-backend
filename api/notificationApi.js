const router = require('express').Router();
const { getAllNotifications, sendNotificationByAdmin } = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class NotificationAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get('/', authMiddleware([ROLES.ADMIN]), getAllNotifications);
        router.post('/', authMiddleware([ROLES.ADMIN]), sendNotificationByAdmin);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/notification';
    }
}

module.exports = NotificationAPI;
