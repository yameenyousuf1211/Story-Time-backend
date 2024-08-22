const router = require('express').Router();
const { getAllNotifications, sendNotificationByAdmin, sendTestNotification } = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class NotificationAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get('/', authMiddleware(Object.values(ROLES)), getAllNotifications);
        router.post('/', authMiddleware([ROLES.ADMIN]), sendNotificationByAdmin);
        router.post('/test', sendTestNotification);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/notification';
    }
}

module.exports = NotificationAPI;
