const { createChat, findChat, updateChat } = require("../models/supportChatModel");
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { getUserById } = require("../models/userModel");
const { getChatsQuery } = require("../controllers/queries/supportChatQueries");
const { getAllMessagesAggregate, readMessages, findMessages, createMessage, findMessageById } = require("../models/supportMessageModel");
const { ApiError } = require("../utils/apiError");
const { Types } = require("mongoose");
const { STATUS_CODES, ROLES } = require("../utils/constants");
const { sendMessageValidation } = require("../validations/supportChatValidation");

// listener for new chat
const createChatEvent = (socket) => {
    socket.on("create-chat", async (user) => {
        const chat = await createChat({ user });
        socket.emit("create-chat", chat);
    });
}

const getChatListEvent = (socket) => {
    socket.on("get-chat-list", async (eventData) => {
        try {
            const { page = 1, limit = 10, search = '' } = eventData.data || {};

            const userId = socket.user.id;
            const role = socket.user.role;

            const query = await getChatsQuery(userId, search, role);

            const supportChatsData = await getAllMessagesAggregate({ query, page, limit });

            if (supportChatsData?.supportChats?.length === 0) {
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
    socket.on("get-chat-messages", async (eventData) => {
        try {
            const { chat, page = 1, limit = 10 } = eventData.data || {};

            if (!Types.ObjectId.isValid(chat)) {
                socket.emit("get-chat-messages", { error: "Invalid chat id" });
                return;
            }

            const chatObj = await findChat({ _id: chat });
            if (!chatObj) {
                socket.emit("get-chat-messages", { error: "Chat not found" });
                return;
            }

            const adminUpdateQuery = { chat, isAdmin: true, isRead: false };
            const userUpdateQuery = { chat, isAdmin: false, isRead: false };

            await readMessages(adminUpdateQuery);
            await readMessages(userUpdateQuery);

            const messagesData = await findMessages({ query: { chat }, page, limit });

            if (messagesData?.data?.length === 0) {
                socket.emit("get-chat-messages", { message: "No messages found" });
                return;
            }

            socket.emit("get-chat-messages", { message: "Messages fetched successfully", data: messagesData });
        } catch (error) {
            console.error('Error in getChatMessagesEvent:', error);
            socket.emit("socket-error", error?.message || "Something went wrong while fetching chat messages.");
        }
    });
};

const sendMessageEvent = (socket) => {
    socket.on("send-message", async (eventData) => {
        try {
            console.log('sendMessageEvent data:', eventData);
            const data = eventData.data || eventData;

            const { error } = sendMessageValidation.validate(data);
            if (error) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY, message: error.details[0].message });
                return;
            }

            const chatObj = await findChat({ _id: data.chat });
            if (!chatObj) {
                socket.emit("socket-error", { statusCode: STATUS_CODES.NOT_FOUND, message: "Chat not found" });
                return;
            }

            let message = await createMessage({
                chat: data.chat,
                user: chatObj.user,
                isAdmin: socket.user.role === ROLES.ADMIN,
                text: data.text,
                media: data.media
            });

            await updateChat({ _id: data.chat }, { lastMessage: message._id });

            message = await findMessageById(message._id)
                .populate({
                    path: 'chat',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName username photo'
                    }
                });

            socket.to(data.chat).emit("send-message", message);
            socket.emit("send-message", message);

        } catch (error) {
            console.error('Error in sendMessageEvent:', error);
            socket.emit("socket-error", { message: error.message || "Something went wrong while sending the message." });
        }
    });
};

exports.initializeSocketIO = (io) => {
    return io.on("connection", async (socket) => {
        try {
            // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
            let token = cookies?.accessToken;
            console.log('Token from cookies:', token);

            if (!token) {
                token = socket.handshake.auth?.token;
                console.log('Token from handshake.auth:', token);
            }

            if (!token) {
                throw new ApiError(401, "Unauthorized handshake. Token is missing");
            }

            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decodedToken.id; // Note: changed from _id to id based on your token structure
            const role = decodedToken.role;
            const user = await getUserById(decodedToken?._id).select(
                "-password -refreshToken -email "
            );
            if (!user) {
                throw new ApiError(401, "Unauthorized handshake. User not found");
            }
            socket.user = { id: userId, role };
            console.log('Socket connected');

            socket.join(userId);

            createChatEvent(socket);
            getChatListEvent(socket);
            getChatMessagesEvent(socket);
            sendMessageEvent(socket);

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