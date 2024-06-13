const { findChat, createChat, updateChat, getAllChats } = require('../models/supportChatModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils');
const { STATUS_CODES, ROLES, SUPPORT_CHAT_STATUS } = require('../utils/constants');
const { findMessageById, createMessage, findMessages, getMessages, updateMessages, countUnreadMessages } = require('../models/supportMessageModel');
const { sendMessageValidation } = require('../validations/supportChatValidation');
const { Types } = require('mongoose');
const { sendMessageIO, closeTicketIO, updateUnreadMessagesIO } = require('../service/supportService');
const { getChatsQuery } = require('./queries/supportChatQueries');

// get chat list
exports.getChatList = asyncHandler(async (req, res, next) => {
    const user = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const search = req.query.search || '';

    let query = {};
    if (req.user.role !== ROLES.ADMIN) query['user'] = new Types.ObjectId(user);


    const aggregateQuery = await getChatsQuery(query, search);

    const supportChatsData = await getAllChats({ query: aggregateQuery, page, limit });
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
        await updateChat({ _id: chatObj._id }, { lastMessage: body._id });

    } else {
        chatObj = await createChat({ user: body.user });
        body.chat = chatObj._id;

        //update chat
        await updateChat({ _id: chatObj._id }, { lastMessage: body._id });
    }

    let message = await createMessage(body);
    message = await findMessageById(message._id)
        .populate('user', 'firstName lastName username profileImage');

    // send message socket
    sendMessageIO(body.chat, message);

    // update last message in support chat
    await updateChat({ _id: body.chat }, { lastMessage: message._id });

    // Count unread messages
    const unreadMessagesCount = await countUnreadMessages({ chat: body.chat, isRead: false });

    // Emit the updated unread messages count and last message
    updateUnreadMessagesIO(body.chat, unreadMessagesCount, message);

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

    const messagesData = await findMessages({ query: { chat: chatId }, page, limit });

    if (messagesData?.supportMessages?.length === 0) {
        generateResponse(null, "No messages found", res);
        return;
    }

    // Mark all messages in this chat as read
    await updateMessages({ chat: chatId, isRead: false }, { isRead: true });

    // Count unread messages
    const unreadMessagesCount = await countUnreadMessages({ chat: chatId, isRead: false });

    // Emit the updated unread messages count
    updateUnreadMessagesIO(chatId, unreadMessagesCount);

    generateResponse(messagesData, "Messages fetched successfully", res);
});
