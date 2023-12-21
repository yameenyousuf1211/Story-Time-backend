const router = require('express').Router();
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { usernameAvailability, getAllUsers, getUserProfile } = require('../controllers/userController');

class UserAPI {
  constructor() {
    this.router = router;
    this.setupRoutes();
  }

  setupRoutes() {
    router.get('/', authMiddleware(Object.values(ROLES)), getAllUsers);
    router.get('/profile', authMiddleware(Object.values(ROLES)), getUserProfile);

    router.post('/check-username', usernameAvailability);
  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return '/user';
  }
}

module.exports = UserAPI;