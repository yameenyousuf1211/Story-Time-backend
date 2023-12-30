const router = require('express').Router();
const {
    register,
    login,
    logout,
    getRefreshToken,
    sendVerificationCode,
    verifyCode,
    resetPassword,
    sendVerificationCodeEmail,
    sendVerificationCodePhone,
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
       // router.post('/send-code', sendVerificationCode);
        router.put('/verify-code', verifyCode);
        router.put('/reset-password', authMiddleware([ROLES.USER]), resetPassword);
        router.put('/refresh-token', getRefreshToken);

        router.post('/send-code-email',sendVerificationCodeEmail)
        router.post('/send-code-phone',sendVerificationCodePhone)

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/auth';
    }
}

module.exports = AuthAPI;