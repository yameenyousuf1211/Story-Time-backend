const { verify } = require('jsonwebtoken');
const { STATUS_CODES } = require('../utils/constants');
const { findUser } = require('../models/userModel');

module.exports = (roles) => {
    return async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1] || req.header('accessToken') || req.header('resetToken') || req.session.accessToken;
        if (!token) return next({
            statusCode: STATUS_CODES.UNAUTHORIZED,
            message: 'Authorization failed!'
        });

        try {
            const decoded = verify(token, process.env.JWT_SECRET);
            req.user = { ...decoded };

            // If it's a reset token, skip role and user activity checks
            if (req.header('resetToken')) {
                return next();
            }

            // Check user activity and roles for access tokens
            const user = await findUser({ _id: req.user.id });

            if (!user || !user.isActive) return next({
                statusCode: STATUS_CODES.FORBIDDEN,
                message: 'Your account is inactive, please contact admin'
            });

            if (!roles.includes(req.user.role)) return next({
                statusCode: STATUS_CODES.UNAUTHORIZED,
                message: 'Unauthorized access!'
            });

            next();
        } catch (err) {
            return next({
                statusCode: STATUS_CODES.UNAUTHORIZED,
                message: 'Token invalid'
            });
        }
    }
}