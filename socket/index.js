const { createChat, findChat, updateChat } = require("../models/supportChatModel");
const jwt = require('jsonwebtoken');
const { getChatsQuery } = require("../controllers/queries/supportChatQueries");
const { getAllMessagesAggregate, readMessages, findMessages, createMessage, findMessageById, countMessages, aggregateDocument, getUserAdminUnreadCount } = require("../models/supportMessageModel");
const { ApiError } = require("../utils/apiError");
const { Types } = require("mongoose");
const { STATUS_CODES, ROLES, SUPPORT_CHAT_STATUS, NOTIFICATION_TYPES } = require("../utils/constants");
const { sendMessageValidation } = require("../validations/supportChatValidation");
const { findUser, getAdmins } = require("../models/userModel");
const { createAndSendNotification, getNotificationCount } = require("../models/notificationModel");

// listener for new chat
const createChatEvent = (socket, io) => {
    socket.on("create-chat", async (userId) => {
        const user = await findUser({ _id: userId });
        if (!user) {
            socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "User not found" });
            return;
        }
        const chat = await createChat({ user: user._id });

        const response = {
            chat: {
                _id: chat._id,
                status: chat.status,
                lastMessage: chat.lastMessage,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
            },
            unreadMessages: 0,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
                isDeleted: user.isDeleted,
                profileImage: user.profileImage
            },
            _id: chat._id,
        }

        io.emit("create-chat", response);
    });
}

const getChatListEvent = (socket) => {
    socket.on("get-chat-list", async ({ page = 1, limit = 10, search = '' }) => {
        try {
            const userId = socket.user.id;
            const role = socket.user.role;

            const query = await getChatsQuery(userId, search, role);

            const supportChatsData = await getAllMessagesAggregate({ query, page, limit });

            if (supportChatsData?.data?.length === 0) {
                socket.emit("get-chat-list", { message: "No chats found" });
                return;
            }

            socket.emit("get-chat-list", { message: "Chats fetched successfully", data: supportChatsData });
        } catch (error) {
            console.error('Error in getChatListEvent:', error);
            socket.emit("socket-error", error?.message || "Something went wrong while fetching the chat list.");
        }
    });
};

const getChatMessagesEvent = (socket) => {
    socket.on("get-chat-messages", async ({ chat, page = 1, limit = 10 }) => {
        try {
            if (!Types.ObjectId.isValid(chat)) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY, message: "Invalid chat id" });
                return;
            }

            const chatObj = await findChat({ _id: chat });
            if (!chatObj) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat not found" });
                return;
            }

            const role = socket.user.role;
            const isAdmin = role === ROLES.ADMIN;

            await readMessages({ chat, isAdmin: !isAdmin });

            const unreadCount = await countMessages({ chat, isAdmin: !isAdmin, isRead: false });

            socket.emit(`unread-count-${chat}`, { chatId: chat, unreadCount });

            const messagesData = await findMessages({ query: { chat }, page, limit });

            if (messagesData?.data?.length === 0) {
                socket.emit("get-chat-messages", { message: "No messages found" });
                return;
            }

            socket.emit(`get-chat-messages-${chat}`, { message: "Messages fetched successfully", data: messagesData });
        } catch (error) {
            console.error('Error in getChatMessagesEvent:', error);
            socket.emit("socket-error", error?.message || "Something went wrong while fetching chat messages.");
        }
    });
};

const sendMessageEvent = (socket, io) => {
    socket.on("send-message", async ({ chat, text, media = null }) => {
        try {
            console.log('sendMessageEvent :', chat, text, media);

            const { error } = sendMessageValidation.validate({ chat, text, media });
            if (error) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY, message: error.details[0].message });
                return;
            }

            const supportChat = await findChat({ _id: chat, status: { $ne: SUPPORT_CHAT_STATUS.CLOSED } });
            if (!supportChat) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat is already closed." });
                return;
            }

            const chatObj = await findChat({ _id: chat });
            if (!chatObj) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat not found" });
                return;
            }

            let message = await createMessage({
                chat,
                user: chatObj.user,
                isAdmin: socket.user.role === ROLES.ADMIN,
                text: text,
                media
            });

            await updateChat({ _id: chat }, { $set: { lastMessage: message._id } });

            message = await findMessageById(message._id)
                .populate({
                    path: 'chat',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName username profileImage'
                    }
                });

            io.emit(`send-message-${chat}`, message);

            const countResponse = await getUserAdminUnreadCount(chat);
            const { adminUnreadCount, userUnreadCount } = countResponse;

            const isAdmin = socket.user.role === ROLES.ADMIN;

            if (isAdmin) {
                io.to(supportChat.user.toString()).emit(`unread-count-${chat}`, {
                    chatId: chat,
                    unreadCount: userUnreadCount
                });
            } else {
                io.to('admins').emit(`unread-count-${chat}`, {
                    chatId: chat,
                    unreadCount: adminUnreadCount
                });

            }
            await createAndSendNotification({
                senderId: socket.user.id,
                isReceiverAdmin: isAdmin ? false : true,
                ...(isAdmin && { receiverId: supportChat.user }),
                type: NOTIFICATION_TYPES.SUPPORT_MESSAGE,
                message: text,
                chatId: chat
            });

            if (!isAdmin) {
                const adminUnreadNotificationCount = await getNotificationCount({ isReceiverAdmin: true, isRead: false });
                io.to('admins').emit('unread-notifications-count', { unreadCount: adminUnreadNotificationCount });
            }

        } catch (error) {
            console.error('Error in sendMessageEvent:', error);
            socket.emit("socket-error", { message: error.message || "Something went wrong while sending the message." });
        }
    });
};


const closeChatEvent = (socket, io) => {
    socket.on("close-chat", async ({ chat }) => {
        try {
            const supportChat = await findChat({ _id: chat, status: { $ne: SUPPORT_CHAT_STATUS.CLOSED } });
            if (!supportChat) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat not found" });
                return;
            }

            await updateChat({ _id: chat }, { $set: { status: SUPPORT_CHAT_STATUS.CLOSED } });

            io.emit(`close-chat-${chat}`, { message: "Chat closed successfully" });
        } catch (error) {
            console.error('Error in closeChatEvent:', error);
            socket.emit("socket-error", { message: error.message || "Something went wrong while closing the chat." });
        }
    });
};

exports.initializeSocketIO = (io) => {
    return io.on("connection", async (socket) => {
        try {
            // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
            const token = socket.handshake.headers?.['access-token'];
            console.log('socket.handshake.headers?.access-token >> ', token);
            if (!token) {
                throw new ApiError(401, "Unauthorized handshake. Token is missing");
            }

            // io.emit will emit to all connected sockets
            // socket.emit will emit to the current connected socket
            // socket.broadcast.emit will emit to all connected sockets except the current socket

            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

            // mount the user object on the socket
            socket.user = decodedToken;

            console.log('Socket connected');
            socket.join(socket.user.role === ROLES.ADMIN ? 'admins' : socket.user.id.toString());

            // Common events that needs to be mounted on the initialization
            createChatEvent(socket, io);
            getChatListEvent(socket);
            getChatMessagesEvent(socket);
            sendMessageEvent(socket, io);
            closeChatEvent(socket, io);

            socket.on("disconnect", async () => {
                console.log("User has disconnected");
            });

        } catch (error) {
            console.error("Error during socket connection:", error);
            socket.emit("socket-error", error?.message || "Something went wrong while connecting to the socket.");
        }
    });
};
