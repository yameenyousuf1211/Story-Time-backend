const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const { getMongoosePaginatedData } = require("../utils");
const { getFcmTokens } = require("./userModel");
const FCM = require('fcm-node');

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
    console.log('first fcmTokens >>> ', fcmTokens)

    const notification = await NotificationModel.create({ title, message });

    sendNotifications({ title, message, fcmTokens });

    return notification;
}

function sendNotifications({ title, message, fcmTokens, priority = 'normal' }) {
    const serverKey = process.env.FIREBASE_SERVER_KEY;
    const fcm = new FCM(serverKey);

    const messageObj = {
        registration_ids: fcmTokens,
        priority,
        notification: {
            title,
            body: message
        },
    };

    // Send the notification
    fcm.send(messageObj, (error, response) => {
        if (error) {
            console.error('Error sending notification:', error);
        } else {
            console.log('Notification sent successfully:', response);
        }
    });
}
