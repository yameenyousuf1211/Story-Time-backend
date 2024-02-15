const Joi = require('joi');

// send notifications by admin validation
exports.sendNotificationsByAdminValidation = Joi.object({
    title: Joi.string().required(),
    message: Joi.string().required(),
    sendToAll: Joi.boolean().default(false),
});