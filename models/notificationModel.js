const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const { getMongoosePaginatedData, sendFirebaseNotification } = require("../utils");
const { getFcmTokens, findUser } = require("./userModel");
const { NOTIFICATION_TYPES } = require("../utils/constants");


const notificationSchema = new Schema({
    receiver: { type: Schema.Types.ObjectId, ref: "User" },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES) },
    story: { type: Schema.Types.ObjectId, ref: "Story" },
    body: { type: String, default: null },
    title: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
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
    data,
    message,
    title,
    story,
    save = true,
}) => {
    let body;

    const fcmTokens = await getFcmTokens(receiverId);

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

        default:
            break;
    }

    let notification = null;
    if (save) {
        notification = await NotificationModel.create({
            receiver: receiverId,
            sender: sender?._id,
            type,
            body,
            title,
            story
        });
    }

    if (fcmTokens.length > 0) {
        fcmTokens.forEach(async (token) => {
            await sendFirebaseNotification({
                title,
                body,
                token,
                data
            });
        });
    }

    return notification;
};