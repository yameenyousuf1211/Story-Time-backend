const { createChat } = require("../models/supportChatModel");

// listener for new chat
const createChatEvent = (socket) => {
    socket.on("create-chat", async (users) => {
        const chat = await createChat({ users: users });
        socket.emit("create-chat", chat);
    });
}

exports.initializeSocketIO = (io) => {
    return io.on("connection", async (socket) => {
        try {
            const { user } = socket.handshake.headers;
            console.log('socket connected >>>>', user);

            // join the room with user id
            socket.join(user);

            // Common events that needs to be mounted on the initialization
            createChatEvent(socket);

            socket.on("disconnect", async () => {
                console.log("user has disconnected..", user);
            });

        } catch (error) {
            socket.emit("socket-error", error?.message || "Something went wrong while connecting to the socket.");
        }
    });
};

exports.emitSocketEvent = (req, event, payload) => {
    req.app.get("io").emit(event, payload);
};