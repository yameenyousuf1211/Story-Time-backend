const { findChats, findChat, createChat, updateChat } = require('../models/supportChatModel');
const { generateResponse, parseBody } = require('../utils');
const { STATUS_CODES, ROLES, SUPPORT_CHAT_STATUS } = require('../utils/constants');
const { s3Uploadv3 } = require('../utils/s3Upload');
const { findMessageById, createMessage, findMessages } = require('../models/supportMessageModel');
const { sendMessageValidation } = require('../validations/supportChatValidation');
const { Types } = require('mongoose');
const { sendMessageIO, closeTicketIO } = require('../service/supportService');

// get chat list
exports.getChatList = async (req, res, next) => {
    const user = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    let query = {};
    if (req.user.role !== ROLES.ADMIN) query = { user };

    try {
        const supportChatsData = await findChats({ query, page, limit });
        if (supportChatsData?.supportChats?.length === 0) {
            generateResponse(null, "No chats found", res);
            return;
        }

        generateResponse(supportChatsData, "Chats fetched successfully", res);
    } catch (error) {
        next(error);
    }
}

// send message by user
exports.sendMessage = async (req, res, next) => {
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

    try {
        if (req.files?.media?.length > 0) body.media = req.files.media.map(file => file.path);

        // media upload to s3
        //if (req?.files?.media?.length > 0) body.media = await s3Uploadv3(req.files?.media);

        if (body.chat) {
            const chatObj = await findChat({ chat: body.chat });
            if (!chatObj) return next({
                statusCode: STATUS_CODES.NOT_FOUND,
                message: 'Chat not found'
            });
        } else {
            const chatObj = await createChat({ user: body.user });
            body.chat = chatObj._id;
        }

        let message = await createMessage(body);
        message = await findMessageById(message._id)
            .populate('user', 'firstName lastName username profileImage');

        // send message socket
        sendMessageIO(body.chat, message);

        // update last message in support chat
        await updateChat({ _id: body.chat }, { lastMessage: message._id });
        generateResponse(message, "user sent message successfully", res);
    } catch (error) {
        next(error);
    }
}

exports.closeChat = async (req, res, next) => {
    const { chat } = parseBody(req.body);

    if (!chat || !Types.ObjectId.isValid(chat)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide chat id properly.'
    });

    try {
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
    } catch (error) {
        next(error);
    }
}

// get chat messages
exports.getChatMessages = async (req, res, next) => {
    const { chatId } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    if (!chatId || !Types.ObjectId.isValid(chatId)) {
        return next({
            statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
            message: 'Please, provide a valid chat id.'
        });
    }

    try {
        const messagesData = await findMessages({ query: { chat: chatId }, page, limit, });

        if (messagesData?.supportMessages?.length === 0) {
            generateResponse(null, "No messages found for the chat", res);
            return;
        }

        generateResponse(messagesData, "Chat messages fetched successfully", res);
    } catch (error) {
        next(error);
    }
};