const router = require('express').Router();
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');
const { checkAvailability, getAllUsers, getUserProfile, followUnFollowToggle,
  getAllFriends, updateProfile, notificationsToggle, blockToggle, getBlockList,
  reportUser, getAllReports, deleteUser, addOrUpdateCard, deleteCard, getCard,
  getAllUsersForAdmin, userStatusToggle, editAdminInfo,
  toggleUserProfileMode, checkAllAvailability, getGuestAndUserCount,
  subscribeUser, createOrFetchGuestUser,
  fetchTotalDownloads } = require('../controllers/userController');
const { upload } = require("../utils/s3Upload");

class UserAPI {
  constructor() {
    this.router = router;
    this.setupRoutes();
  }

  setupRoutes() {
    const router = this.router;

    router.get('/', authMiddleware(Object.values(ROLES)), getAllUsers);
    router.get('/profile', authMiddleware(Object.values(ROLES)), getUserProfile);
    router.get('/friends', authMiddleware([ROLES.USER]), getAllFriends)
    router.get('/block-list', authMiddleware(Object.values(ROLES)), getBlockList)
    router.get('/report-list', authMiddleware([ROLES.ADMIN]), getAllReports)
    router.get('/card', authMiddleware(Object.values(ROLES)), getCard)
    router.get('/get-users', authMiddleware([ROLES.ADMIN]), getAllUsersForAdmin);
    router.get('/user-count', getGuestAndUserCount);
    router.get('/total-downloads', fetchTotalDownloads);

    router.post('/check-availability', checkAvailability); // checking uniqueness of email, or username (1 at a time)
    router.post('/follow-toggle', authMiddleware([ROLES.USER]), followUnFollowToggle);
    router.post('/report-user', authMiddleware([ROLES.USER]), reportUser);
    router.post('/card', authMiddleware(Object.values(ROLES)), addOrUpdateCard);
    router.post('/availability', authMiddleware(Object.values(ROLES)), checkAllAvailability);  // checking uniqueness of email, or username (all at once)
    router.post('/create-guest', createOrFetchGuestUser);

    router.put('/update-profile', authMiddleware(Object.values(ROLES)),
      upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]),
      updateProfile);
    router.put('/notifications', authMiddleware(Object.values(ROLES)), notificationsToggle);
    router.put('/block', authMiddleware(Object.values(ROLES)), blockToggle);
    router.put('/update-status', authMiddleware([ROLES.ADMIN]), userStatusToggle);
    router.put('/admin-info', authMiddleware([ROLES.ADMIN]), editAdminInfo);
    router.put('/profile-mode', authMiddleware([ROLES.USER]), toggleUserProfileMode);
    router.put('/subscribe', subscribeUser);

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
