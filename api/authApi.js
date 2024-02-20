const router = require('express').Router();
const {
    register,
    login,
    logout,
    getRefreshToken,
    sendVerificationCode,
    verifyCode,
    resetPassword,
    sendResetLink,
    verifyResetToken,
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth')
const { ROLES } = require('../utils/constants');

class AuthAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.post('/register', register);
        router.post('/login', login);
        router.post('/logout', authMiddleware(Object.values(ROLES)), logout);
        router.post('/send-code', sendVerificationCode);

        router.put('/verify-code', verifyCode);
        router.put('/reset-password', authMiddleware(Object.values(ROLES)), resetPassword);
        router.put('/refresh-token', getRefreshToken);
        router.put('/forget-password', authMiddleware([ROLES.ADMIN]), sendResetLink);
        router.put('/verify-reset-token', authMiddleware([ROLES.ADMIN]), verifyResetToken);

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/auth';
    }
}

module.exports = AuthAPI;