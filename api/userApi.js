const { Router } = require('express');
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { usernameAvailability, getAllUsers } = require('../controllers/userController');


class UserAPI {
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  setupRoutes() {
    const router = this.router;
    
    router.post('/check-username', authMiddleware(Object.values(ROLES)), usernameAvailability);
    router.post('/find-user',getAllUsers );

  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return '/users'; 
  }
}

module.exports = UserAPI;