'use strict';

const { verify } = require('jsonwebtoken');
const { STATUS_CODES } = require('../utils/constants');
const { findUser } = require('../models/userModel');

module.exports = (roles) => {
    return (req, res, next) => {
        const accessToken = req.header('accessToken') || req.session.accessToken;
        if (!accessToken) {
            return next({
                statusCode: STATUS_CODES.UNAUTHORIZED,
                message: 'Authorization failed!'
            });
        }

        verify(accessToken, process.env.JWT_SECRET, function (err, decoded) {
            if (err) {
                return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Invalid token!'
                })
            }
            req.user = { ...decoded };

            findUser({ _id: req.user.id }).then(user => {
                if (!user) return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Invalid token!'
                });

                if (!user.isActive) return next({
                    statusCode: STATUS_CODES.FORBIDDEN,
                    message: 'Your profile is inactive, please contact admin'
                });

                if (roles.includes(req.user.role)) {
                    next();
                } else return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Unauthorized access!'
                });
            }).catch(err => {
                return next({
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    message: 'Invalid token!'
                });
            });
        });
    }
}