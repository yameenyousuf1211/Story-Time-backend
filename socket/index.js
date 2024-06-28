const { createChat } = require("../models/supportChatModel");
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { getUserById } = require("../models/userModel");
const { getChatsQuery } = require("../controllers/queries/supportChatQueries");
const { getAllMessagesAggregate } = require("../models/supportMessageModel");
const { ApiError } = require("../utils/apiError");

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