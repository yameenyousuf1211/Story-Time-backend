const socketIO = require('socket.io');
const { updateUser } = require('./models/userModel');

let io;

exports.io = (server) => {
    io = socketIO(server);
    io.on('connection', async (socket) => {
        const userObj = await updateUser({ _id: socket?.handshake?.headers?.user_id }, { online: true });

        // broadcast to all users except the one who is connected
        socket.emit('user-connected', userObj);

        socket.on('disconnect', async () => {
            const userObj = await updateUser({ _id: socket?.handshake?.headers?.user_id }, { online: false });
            socket.emit('user-disconnected', userObj);
        });
    });
};

// add user to room
// exports.addUserToGroupIO = (groupId, userId) => {
//     io.emit(`add-user-to-group-${groupId}`, userId);
// }

// // remove user from room
// exports.removeUserFromGroupIO = (groupId, userId) => {
//     io.emit(`remove-user-from-group-${groupId}`, userId);
// }

// // create one to one chat
// exports.createOneToOneChatIO = (receiverId, chatObj) => {
//     io.emit(`create-one-to-one-chat-${receiverId}`, chatObj);
// }

