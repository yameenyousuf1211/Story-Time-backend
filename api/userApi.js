const router = require('express').Router();
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { checkAvailability, getAllUsers, getUserProfile, followUnFollowToggle, getAllFriends } = require('../controllers/userController');

class UserAPI {
  constructor() {
    this.router = router;
    this.setupRoutes();
  }

  setupRoutes() {
    router.get('/', authMiddleware(Object.values(ROLES)), getAllUsers);
    router.get('/profile', authMiddleware(Object.values(ROLES)), getUserProfile);
    router.get('/friends', authMiddleware([ROLES.USER]), getAllFriends)

    router.post('/check-availability', checkAvailability);
    router.post('/follow-toggle', authMiddleware([ROLES.USER]), followUnFollowToggle);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return '/user';
  }
}

module.exports = UserAPI;