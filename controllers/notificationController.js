const { createAndSendNotifications, getAllNotifications } = require('../models/notificationModel.js');
const { getUsers } = require('../models/userModel');
const { generateResponse, parseBody } = require('../utils');
const { STATUS_CODES } = require('../utils/constants');
const { sendNotificationsByAdminValidation } = require('../validations/notificationValidation.js');


// send notifications by admin
exports.sendNotificationByAdmin = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = sendNotificationsByAdminValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    // get users Ids
    const users = [];
    try {
        if (body.sendToAll === 'true') {
            const usersData = await getUsers().select('_id');
            usersData?.forEach(user => users.push(user?._id.toString()));
        } else {
            const activeUsers = await getUsers({ isActive: true }).select('_id');
            activeUsers?.forEach(user => users.push(user?._id.toString()));
        }

        // if no users found return
        if (users.length === 0) return generateResponse(null, 'No users found', res);
        console.log("Users:", users);
        const notification = await createAndSendNotifications({ users, message: body.message, title: body.title });
        generateResponse(notification, 'Notifications sent successfully', res);

    } catch (error) {
        next(error)
    }
}

// get all notifications by admin
exports.getAllNotifications = async (req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    try {
        const notificationsData = await getAllNotifications({ page, limit });
        if (notificationsData?.notifications?.length === 0) {
            generateResponse(null, 'No notifications found', res);
            return;
        }

        generateResponse(notificationsData, 'Notifications found successfully', res);
    } catch (error) {
        next(error);
    }
}