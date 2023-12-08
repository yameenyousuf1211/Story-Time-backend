'use strict';

const { generateResponse } = require('../utils');

exports.DefaultHandler = (req, res, next) => {
    generateResponse(null, `Welcome to the ${process.env.APP_NAME} - API`, res);
};