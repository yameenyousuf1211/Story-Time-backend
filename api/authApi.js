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
    registerWithGoogle,
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
        router.post('/validate-social-id', validateSocialId);

        router.post('/register/google', registerWithGoogle);
        router.post('/login/google', loginWithGoogle);

        router.post('/facebook', loginWithFacebook);

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