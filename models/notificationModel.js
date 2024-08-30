const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const { getMongoosePaginatedData, sendFirebaseNotification } = require("../utils");
const { getFcmTokens, findUser } = require("./userModel");
const { NOTIFICATION_TYPES } = require("../utils/constants");

const notificationSchema = new Schema({
    receiver: { type: Schema.Types.ObjectId, ref: "User" },
    isReceiverAdmin: { type: Boolean, default: false },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES) },
    story: { type: Schema.Types.ObjectId, ref: "Story" },
    title: { type: String, default: null },
    body: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    chatId: { type: Schema.Types.ObjectId },
});

notificationSchema.plugin(mongoosePaginate);

const NotificationModel = model("Notification", notificationSchema);

exports.getAllNotifications = async ({ query, page, limit, populate }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: NotificationModel,
        query,
        page,
        limit,
        populate,
    });

    return { data, pagination };
}

exports.createAndSendNotification = async ({
    sender,
    senderId,
    receiverId,
    type,
    data = {},
    message,
    title,
    story,
    chatId,
    isReceiverAdmin = false,
    save = true,
}) => {
    let body;

    if (!sender && senderId) sender = await findUser({ _id: senderId });

    switch (type) {
        case NOTIFICATION_TYPES.ADMIN_NOTIFICATION:
            body = message;
            title = title;
            break;
        case NOTIFICATION_TYPES.LIKE_POST:
            title = `${sender?.username}`;
            body = `liked your post`;
            break;
        case NOTIFICATION_TYPES.COMMENT:
            title = `${sender?.username}`;
            body = `commented on your post`;
            break;
        case NOTIFICATION_TYPES.SHARE_POST:
            title = `${sender?.username}`;
            body = `shared your post`;
            break;
        case NOTIFICATION_TYPES.SUPPORT_MESSAGE:
            title = 'Support Message';
            body = message;
            break;
        default:
            break;
    }

    let notification = null;
    if (save) {
        notification = await NotificationModel.create({
            ...(receiverId && { receiver: receiverId }),
            sender: sender?._id,
            isReceiverAdmin,
            type,
            body,
            title,
            story,
            chatId,
        });
    }



    if (!isReceiverAdmin) {
        const fcmTokens = await getFcmTokens(receiverId);

        data = {
            notificationId: notification?._id.toString(),
            type: notification?.type,
            storyId: notification?.story?.toString(),
        };

        if (fcmTokens.length > 0) {
        
            const deviceToken = Array.isArray(fcmTokens) ? fcmTokens : [];
            await sendFirebaseNotification(
                title,
                body,
                deviceToken,
                data
            );
        }
    }

    return notification;
};

exports.getNotificationCount = (query) => NotificationModel.countDocuments(query);

exports.updateNotifications = (query, obj) => NotificationModel.updateMany(query, obj);
