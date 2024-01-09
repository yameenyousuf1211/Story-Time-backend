const router = require('express').Router();
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { checkAvailability, getAllUsers, getUserProfile, followUnFollowToggle, getAllFriends, updateProfile, notificationsToggle, blockToggle, getBlockList } = require('../controllers/userController');
const { upload } = require('../utils');

class UserAPI {
  constructor() {
    this.router = router;
    this.setupRoutes();
  }

  setupRoutes() {
    router.get('/', authMiddleware(Object.values(ROLES)), getAllUsers);
    router.get('/profile', authMiddleware(Object.values(ROLES)), getUserProfile);
    router.get('/friends', authMiddleware([ROLES.USER]), getAllFriends)
    router.get('/block-list', authMiddleware(Object.values(ROLES)), getBlockList)

    router.post('/check-availability', checkAvailability);
    router.post('/follow-toggle', authMiddleware([ROLES.USER]), followUnFollowToggle);

    router.put('/update-profile', authMiddleware(Object.values(ROLES)),
      upload('users').fields([{ name: 'coverImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]),
      updateProfile);
    router.put('/notifications', authMiddleware(Object.values(ROLES)), notificationsToggle)

    router.put('/block', authMiddleware(Object.values(ROLES)), blockToggle)


  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return '/user';
  }
}

module.exports = UserAPI;