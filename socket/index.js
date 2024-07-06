const { createChat, findChat, updateChat } = require("../models/supportChatModel");
const jwt = require('jsonwebtoken');
const { getChatsQuery } = require("../controllers/queries/supportChatQueries");
const { getAllMessagesAggregate, readMessages, findMessages, createMessage, findMessageById, countMessages } = require("../models/supportMessageModel");
const { ApiError } = require("../utils/apiError");
const { Types } = require("mongoose");
const { STATUS_CODES, ROLES, SUPPORT_CHAT_STATUS } = require("../utils/constants");
const { sendMessageValidation } = require("../validations/supportChatValidation");

// listener for new chat
const createChatEvent = (socket) => {
    socket.on("create-chat", async (user) => {
        const chat = await createChat({ user });
        socket.emit("create-chat", chat);
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

const getChatMessagesEvent = (socket, io) => {
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
            const query = { chat, isAdmin: role != ROLES.ADMIN, isRead: false };

            // read all messages sent by other
            await readMessages(query);

            const unreadCount = await countMessages(query);
            io.emit(`messages-read-${chat}`, unreadCount);

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

const sendMessageEvent = (socket) => {
    socket.on("send-message", async ({ chat, text, media = null }) => {
        try {
            console.log('sendMessageEvent :', chat, text, media);
            const { error } = sendMessageValidation.validate({ chat, text });
            if (error) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY, message: error.details[0].message });
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
                text,
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

            socket.emit(`send-message-${chat}`, message);

        } catch (error) {
            console.error('Error in sendMessageEvent:', error);
            socket.emit("socket-error", { message: error.message || "Something went wrong while sending the message." });
        }
    });
};

const closeChatEvent = (socket) => {
    socket.on("close-chat", async ({ chat }) => {
        try {
            const supportChat = await findChat({ _id: chat, status: { $ne: SUPPORT_CHAT_STATUS.CLOSED } });
            if (!supportChat) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat not found" });
                return;
            }

            await updateChat({ _id: chat }, { $set: { status: SUPPORT_CHAT_STATUS.CLOSED } });

            socket.emit(`close-chat-${chat}`, { message: "Chat closed successfully" });
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

            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

            // mount the user object on the socket
            socket.user = decodedToken;

            console.log('Socket connected');

            // Common events that needs to be mounted on the initialization
            createChatEvent(socket);
            getChatListEvent(socket);
            getChatMessagesEvent(socket, io);
            sendMessageEvent(socket);
            closeChatEvent(socket);

            socket.on("disconnect", async () => {
                console.log("User has disconnected");
            });

        } catch (error) {
            console.error("Error during socket connection:", error);
            socket.emit("socket-error", error?.message || "Something went wrong while connecting to the socket.");
        }
    });
};

exports.emitSocketEvent = (req, event, payload) => {
    req.app.get("io").emit(event, payload);
};