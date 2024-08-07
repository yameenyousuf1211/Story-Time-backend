const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongoosePaginatedData, getMongooseAggregatePaginatedData } = require("../utils");
const { SUPPORT_CHAT_STATUS } = require("../utils/constants");

const supportChatSchema = new Schema({
    user: { type: Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: Types.ObjectId, ref: "SupportMessage", default: null },
    status: { type: String, enum: Object.values(SUPPORT_CHAT_STATUS), default: SUPPORT_CHAT_STATUS.PENDING },
}, { timestamps: true, versionKey: false });

supportChatSchema.plugin(mongoosePaginate);
supportChatSchema.plugin(aggregatePaginate);

const SupportChatModel = model("SupportChat", supportChatSchema);

// create new chat
exports.createChat = (obj) => SupportChatModel.create(obj);

// update last message in chat
exports.updateChat = (query, obj) => SupportChatModel.updateOne(query, obj, { new: true });

// find chats by query
exports.findChats = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: SupportChatModel,
        query,
        page,
        limit,
        populate: [
            { path: 'users', select: 'firstName lastName username profileImage' },
            { path: 'lastMessage' },
        ],
        sort: { updatedAt: -1 },
    });

    return { supportChats: data, pagination };
}

// find chat by query
exports.findChat = (query) => SupportChatModel.findOne(query);

exports.getAllChats = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: SupportChatModel,
        query,
        page,
        limit,
    });

    return { supportChats: data, pagination };
};
