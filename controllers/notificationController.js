const { getAllNotifications, createAndSendNotification, updateNotifications, getNotificationCount } = require('../models/notificationModel.js');
const { getUsers } = require('../models/userModel');
const { generateResponse, parseBody, asyncHandler, sendFirebaseNotification } = require('../utils');
const { STATUS_CODES, NOTIFICATION_TYPES, ROLES } = require('../utils/constants');
const { sendNotificationsByAdminValidation } = require('../validations/notificationValidation.js');

// send notifications by admin
exports.sendNotificationByAdmin = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = sendNotificationsByAdminValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    // get users Ids
    let users = [];

    if (body.sendToAll) {
        const usersData = await getUsers().select('_id settings.systemNotification');
        users = usersData.filter(user => user.settings.systemNotification).map(user => user._id.toString());
    } else {
        const activeUsers = await getUsers({ isActive: true }).select('_id settings.systemNotification');
        users = activeUsers.filter(user => user.settings.systemNotification).map(user => user._id.toString());
    }

    // if no users found return
    if (users.length === 0) return generateResponse(null, 'No users found', res);
    const notification = await Promise.all(users.map(userId =>
        createAndSendNotification({
            senderId: req.user.id,
            receiverId: userId,
            type: NOTIFICATION_TYPES.ADMIN_NOTIFICATION,
            message: body.message,
            title: body.title,
        })
    ));

    generateResponse(notification, 'Notifications sent successfully', res);
});

// get all notifications by admin
exports.getAllNotifications = asyncHandler(async (req, res, next) => {
    const io = req.app.get('io');  // Retrieve io from the app object
    const isAdmin = req.user.role === ROLES.ADMIN;
    const { page = 1, limit = 10, type = NOTIFICATION_TYPES.ADMIN_NOTIFICATION } = req.query;

    const query = type === NOTIFICATION_TYPES.SUPPORT_MESSAGE
        ? { type, isReceiverAdmin: true }
        : isAdmin ? { type } : { receiver: req.user.id };

    if (isAdmin) {
        await updateNotifications({ isReceiverAdmin: true, isRead: false }, { $set: { isRead: true } });
    }

    const populate = [
        { path: "sender", select: "userName profileImage firstName lastName" },
        { path: "receiver", select: "userName profileImage firstName lastName" },
        { path: "story" }
    ];

    const notificationsData = await getAllNotifications({ query, page, limit, populate });

    if (isAdmin) {
        const adminUnreadNotificationCount = await getNotificationCount({ isReceiverAdmin: true, isRead: false });
        io.to('admins').emit('unread-notifications-count', { unreadCount: adminUnreadNotificationCount });
    }

    if (notificationsData?.notifications?.length === 0) {
        return generateResponse(null, 'No notifications found', res);
    }
    generateResponse(notificationsData, 'Notifications found successfully', res);
});


// send test notification
exports.sendTestNotification = asyncHandler(async (req, res, next) => {
    const { token } = parseBody(req.body);
    const deviceToken = Array.isArray(token) ? token : [token];

    await sendFirebaseNotification('Test Notification', 'This is a test notification', deviceToken, req.body.data)
    generateResponse(null, 'Test notification sent successfully', res);
});