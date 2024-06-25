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
    validateSocialId,
    loginWithGoogle,
    loginWithFacebook,
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
        router.post('/validate-social-Id', validateSocialId);
        router.post('/login-with-google', loginWithGoogle);
        router.post('/login-with-facebook', loginWithFacebook);

        router.put('/verify-code', verifyCode);
        router.put('/reset-password', authMiddleware(Object.values(ROLES)), resetPassword);
        router.put('/refresh-token', getRefreshToken);
        router.put('/forget-password', sendResetLink);

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/auth';
    }
}

module.exports = AuthAPI;