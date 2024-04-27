const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongoosePaginatedData } = require("../utils");

const supportMessageSchema = new Schema({
    chat: { type: Types.ObjectId, ref: "SupportChat" },
    user: { type: Types.ObjectId, ref: "User" },
    text: { type: String, required: true },
    media: [{ type: String }],
}, { timestamps: true, versionKey: false });

supportMessageSchema.plugin(mongoosePaginate);
supportMessageSchema.plugin(aggregatePaginate);

const SupportMessageModel = model("SupportMessage", supportMessageSchema);

// create new message
exports.createMessage = (obj) => SupportMessageModel.create(obj);

// find messages by query with pagination
exports.findMessages = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: SupportMessageModel,
        query,
        page,
        limit,
        sort: { createdAt: 1 },
        populate: {
            path: 'user',
            select: 'firstName lastName username profileImage'
        },
    });

    return { supportMessages: data, pagination };
}

// get messages without pagination
exports.getMessages = (query) => SupportMessageModel.find(query);

// find message by query
exports.findMessageById = (messageId) => SupportMessageModel.findById(messageId);

// update message by query
exports.updateMessages = (query, obj) => SupportMessageModel.updateMany(query, obj, { new: true });

// delete message by user
exports.updateMessageById = (messageId, obj) => SupportMessageModel.findByIdAndUpdate(messageId, obj, { new: true });
