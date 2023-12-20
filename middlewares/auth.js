const { verify } = require('jsonwebtoken');
const { STATUS_CODES } = require('../utils/constants');
const { findUser } = require('../models/userModel');

module.exports = (roles) => {
    return (req, res, next) => {
        const accessToken = req.header('accessToken') || req.session.accessToken;
        if (!accessToken) return next({
            statusCode: STATUS_CODES.UNAUTHORIZED,
            message: 'Authorization failed!'
        });

        verify(accessToken, process.env.JWT_SECRET, function (err, decoded) {
            if (err) return next({
                statusCode: STATUS_CODES.UNAUTHORIZED,
                message: 'token expired'
            });

            req.user = { ...decoded };

            findUser({ _id: req.user.id }).then(user => {
                // throw error if user is not active
                if (!user.isActive) return next({
                    statusCode: STATUS_CODES.FORBIDDEN,
                    message: 'Your profile is inactive, please contact admin'
                });

                if (!roles.includes(req.user.role)) return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Unauthorized access!'
                });

                // next function called
                next();
            }).catch(err => {
                return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Invalid token!'
                });
            });
        });
    }
}