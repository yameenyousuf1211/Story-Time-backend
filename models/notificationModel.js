const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const { getMongoosePaginatedData, sendFirebaseNotification } = require("../utils");
const { getFcmTokens } = require("./userModel");

const notificationSchema = new Schema({
    title: { type: String },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// implemented mongoose pagination plugin
notificationSchema.plugin(mongoosePaginate);

// model compiled
const NotificationModel = model("Notification", notificationSchema);

// get all notifications
exports.getAllNotifications = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: NotificationModel,
        query,
        page,
        limit,
    });

    return { notifications: data, pagination };
}

// create and send notification 
exports.createAndSendNotifications = async ({ users, message, title }) => {
    const fcmTokens = await getFcmTokens(users);
    console.log('fcmTokens >>> ', fcmTokens)

    const notification = await NotificationModel.create({ title, message });
    if (fcmTokens.length === 0) return notification;

    fcmTokens.forEach(async (token) => {
        await sendFirebaseNotification({
            title,
            body: message,
            token
        });
    });

    return notification;
}