const { findChat, updateChat } = require('../models/supportChatModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils');
const { STATUS_CODES, SUPPORT_CHAT_STATUS, ROLES } = require('../utils/constants');
const { findMessageById, createMessage, findMessages, getAllMessagesAggregate, readMessages } = require('../models/supportMessageModel');
const { sendMessageValidation } = require('../validations/supportChatValidation');
const { Types } = require('mongoose');
const { emitSocketEvent } = require('../socket');
const { getChatsQuery } = require('./queries/supportChatQueries');

// get chat list
exports.getChatList = asyncHandler(async (req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const search = req.query.search || '';

    const query = await getChatsQuery(req.user.id, search);

    const supportChatsData = await getAllMessagesAggregate({ query, page, limit })
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

    if (req.files?.media?.length > 0) body.media = req.files.media.map(file => file.path);

    let message = await createMessage({
        chat: body.chat,
        isAdmin: req.user.role === ROLES.ADMIN,
        text: body.text,
        media: body.media
    });

    // update chat
    await updateChat({ _id: body.chat }, { lastMessage: message._id });

    message = await findMessageById(message._id)
        .populate({
            path: 'chat',
            populate: {
                path: 'user',
                select: 'firstName lastName username photo'
            }
        });

    // send message socket
    emitSocketEvent(req, `send-message-${body.chat}`, message);

    generateResponse(message, "User sent message successfully", res);
});

// close chat
exports.closeChat = asyncHandler(async (req, res, next) => {
    // user is 2nd user except login user
    const { chat, user } = parseBody(req.body);

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
    emitSocketEvent(req, `close-ticket-${chat}`, supportChat);

    generateResponse(supportChat, "Chat closed successfully", res);
});

// get chat messages
exports.getChatMessages = asyncHandler(async (req, res, next) => {
    const { chat } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    if (!Types.ObjectId.isValid(chatId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Invalid chat ID'
    });

    const messagesData = await findMessages({ query: { chat }, page, limit });

    if (messagesData?.data?.length === 0) {
        generateResponse(null, "No messages found", res);
        return;
    }

    // mark all messages as read
    await readMessages({ chat, receiver: req.user.id, isRead: false });

    generateResponse(messagesData, "Messages fetched successfully", res);
});