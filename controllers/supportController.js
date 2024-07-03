const { findChat, updateChat } = require('../models/supportChatModel');
const { generateResponse, parseBody, asyncHandler } = require('../utils');
const { STATUS_CODES, SUPPORT_CHAT_STATUS, ROLES } = require('../utils/constants');
const { findMessageById, createMessage, findMessages, getAllMessagesAggregate, readMessages } = require('../models/supportMessageModel');
const { sendMessageValidation } = require('../validations/supportChatValidation');
const { Types } = require('mongoose');
const { emitSocketEvent } = require('../socket');
const { getChatsQuery } = require('./queries/supportChatQueries');
const { s3Uploadv3 } = require('../utils/s3Upload');

// get chat list
exports.getChatList = asyncHandler(async (req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const search = req.query.search || '';

    const query = await getChatsQuery(req.user.id, search, req.user.role);

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

    const chatObj = await findChat({ _id: body.chat });
    if (!chatObj) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Chat not found"
    });

    let message = await createMessage({
        chat: body.chat,
        user: chatObj.user,
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
    const { chat } = parseBody(req.body);

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!Types.ObjectId.isValid(chat)) return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: "Invalid chat id"
    });

    const chatObj = await findChat({ _id: chat });
    if (!chatObj) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: "Chat not found"
    });

    const adminUpdateQuery = { chat, isAdmin: true, isRead: false };
    const userUpdateQuery = { chat, isAdmin: false, isRead: false };

    await readMessages(adminUpdateQuery);
    await readMessages(userUpdateQuery);

    const messagesData = await findMessages({ query: { chat }, page, limit });

    if (messagesData?.data?.length === 0) {
        generateResponse(null, "No messages found", res);
        return;
    }

    generateResponse(messagesData, "Messages fetched successfully", res);
});

exports.uploadMedia = asyncHandler(async (req, res, next) => {
    if (req?.files?.media?.length > 0) media = await s3Uploadv3(req.files?.media);
    generateResponse({ media }, 'Media uploaded successfully', res);
});