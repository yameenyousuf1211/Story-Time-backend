const router = require('express').Router();
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { checkAvailability, getAllUsers, getUserProfile, followUnFollowToggle, getAllFriends, updateProfile, notificationsToggle, blockToggle, getBlockList, reportUser, getAllReports, deleteUser, addOrUpdateCard, deleteCard } = require('../controllers/userController');
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
    router.get('/report-list', authMiddleware([ROLES.ADMIN]), getAllReports)


    router.post('/check-availability', checkAvailability);
    router.post('/follow-toggle', authMiddleware([ROLES.USER]), followUnFollowToggle);
    router.post('/report-user', authMiddleware([ROLES.USER]), reportUser);
    router.post('/card', authMiddleware(Object.values(ROLES)), addOrUpdateCard)


    router.put('/update-profile', authMiddleware(Object.values(ROLES)),
      upload('users').fields([{ name: 'coverImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]),
      updateProfile);
    router.put('/notifications', authMiddleware(Object.values(ROLES)), notificationsToggle)
    router.put('/block', authMiddleware(Object.values(ROLES)), blockToggle)


    router.delete('/delete-account', authMiddleware(Object.values(ROLES)), deleteUser);
    router.delete('/delete-card', authMiddleware(Object.values(ROLES)), deleteCard);


  }

  getRouter() {
    return this.router;
  }

  getRouterGroup() {
    return '/user';
  }
}

module.exports = UserAPI;