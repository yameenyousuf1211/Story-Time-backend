const { findChats, findChat, createChat, updateChat } = require('../models/supportChatModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils');
const { STATUS_CODES, ROLES, SUPPORT_CHAT_STATUS } = require('../utils/constants');
const { findMessageById, createMessage, findMessages, getMessages, updateMessages } = require('../models/supportMessageModel');
const { sendMessageValidation } = require('../validations/supportChatValidation');
const { Types } = require('mongoose');
const { sendMessageIO, closeTicketIO, sendUnreadCountIO } = require('../service/supportService');
const { getUsers } = require('../models/userModel');

// get chat list
exports.getChatList = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const search = req.query.search || '';

    let query = {};
    if (req.user.role !== ROLES.ADMIN) query = { user };

    if (search) {
        const users = await getUsers({
            '$or': [
                { 'firstName': { '$regex': search, '$options': 'i' } },
                { 'lastName': { '$regex': search, '$options': 'i' } }
            ]
        });

        query['user'] = { '$in': users.map(user => user._id) };
    }

    const supportChatsData = await findChats({ query, page, limit });
    if (supportChatsData?.supportChats?.length === 0) {
        generateResponse(null, "No chats found", res);
        return;
    }

    generateResponse(supportChatsData, "Chats fetched successfully", res);
});

// send message by user
exports.sendMessage = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    const { error } = sendMessageValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    if (req.user.role !== ROLES.ADMIN) {
        body.user = req.user.id;
    } else {
        body.user = null;
    }

    if (req.files?.media?.length > 0) body.media = req.files.media.map(file => file.path);

    let chatObj;
    if (body.chat) {
        chatObj = await findChat({ _id: body.chat });
        if (!chatObj) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Chat not found'
        });

        // Increment unread messages count
        await updateChat({ _id: body.chat }, { $inc: { unreadMessages: 1 } });

    } else {
        chatObj = await createChat({ user: body.user });
        body.chat = chatObj._id;

        // Since this is a new chat, unreadMessages should start at 1
        await updateChat({ _id: body.chat }, { unreadMessages: 1 });
    }

    let message = await createMessage(body);
    message = await findMessageById(message._id)
        .populate('user', 'firstName lastName username profileImage');

    // send message socket
    sendMessageIO(body.chat, message);

    // update last message in support chat
    await updateChat({ _id: body.chat }, { lastMessage: message._id });

    // Emit unread messages count
    sendUnreadCountIO(body.chat, chatObj.unreadMessages + 1);

    generateResponse(message, "User sent message successfully", res);
});


// close chat
exports.closeChat = asyncHandler(async (req, res, next) => {
    const { chat } = parseBody(req.body);

    if (!chat || !Types.ObjectId.isValid(chat)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide chat id properly.'
    });

    const supportChat = await findChat({ _id: chat });
    if (!supportChat) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Chat not found"
    });
    supportChat.status = SUPPORT_CHAT_STATUS.CLOSED;
    await supportChat.save();

    // close ticket socket
    closeTicketIO(supportChat._id, supportChat);

    generateResponse(supportChat, "Chat closed successfully", res);
    next(error);
});

// get chat messages
exports.getChatMessages = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    if (!Types.ObjectId.isValid(chatId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Invalid chat ID'
    });

    const messagesData = await findMessages({ query: { chat: chatId }, page, limit, });

    if (messagesData?.supportMessages?.length === 0) {
        generateResponse(null, "No messages found", res);
        return;
    }

    generateResponse(messagesData, "Messages fetched successfully", res);
});

exports.markMessagesAsRead = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!Types.ObjectId.isValid(chatId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Invalid chat ID'
    });
    console.log('chatId', chatId);


    // Find unread messages in the chat
    const unreadMessages = await getMessages({ chat: chatId, user: { $ne: userId }, isRead: false });
    console.log('unreadMessages', unreadMessages.length);

    if (unreadMessages?.length > 0) {
        // Mark messages as read
        await updateMessages({ chat: chatId, user: { $ne: userId }, isRead: false }, { isRead: true });

        // Decrement unread message count
        await updateChat({ _id: chatId }, { $inc: { unreadMessages: -unreadMessages.length } });

        // Emit the updated unread message count
        sendUnreadCountIO(chatId, 0);
    }

    generateResponse(null, "Messages marked as read", res);
});
