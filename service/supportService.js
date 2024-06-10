
let socket = null;

exports.socketIO = (s) => {
    socket = s;
}

// send message (support chat)
exports.sendMessageIO = (chat, message) => {
    socket?.emit(`support-${chat}`, message);
    console.log(`support-${chat}`)
}

// close chat
exports.closeTicketIO = (chat, chatObj) => {
    socket?.emit(`close-ticket-${chat}`, chatObj);

    // socket emit functions with additional logging
}
exports.sendUnreadCountIO = (chat, count) => {
    socket?.emit(`unread-count-${chat}`, { chatId: chat, unreadMessages: count });
    console.log(`unread-count-${chat}`);
}