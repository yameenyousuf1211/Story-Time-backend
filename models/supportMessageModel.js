const { Schema, model, Types } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongoosePaginatedData, getMongooseAggregatePaginatedData } = require("../utils");

const supportMessageSchema = new Schema({
    chat: { type: Types.ObjectId, ref: "SupportChat" },
    user: { type: Types.ObjectId, ref: "User" },
    isAdmin: { type: Boolean, default: false },
    text: { type: String },
    media: { type: [String], default: null },
    isRead: { type: Boolean, default: false },
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

    return { data, pagination };
}

// find messages by query with pagination
exports.getAllMessagesAggregate = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: SupportMessageModel,
        query,
        page,
        limit,
    });

    return { data, pagination };
}

// get messages without pagination
exports.getMessages = (query) => SupportMessageModel.find(query);

// find message by query
exports.findMessageById = (messageId) => SupportMessageModel.findById(messageId);

// update message by query
exports.updateMessages = (query, obj) => SupportMessageModel.updateMany(query, obj);

// delete message by user
exports.updateMessageById = (messageId, obj) => SupportMessageModel.findByIdAndUpdate(messageId, obj, { new: true });

exports.countMessages = (query) => SupportMessageModel.countDocuments(query);

exports.readMessages = (query) => SupportMessageModel.updateMany(query, { $set: { isRead: true } });

exports.aggregateDocument = (query) => SupportMessageModel.aggregate(query);


exports.getUserAdminUnreadCount = async(chatId)=>{
      const response = await SupportMessageModel.aggregate([
        {
            $match: {
                chat: new Types.ObjectId(chatId), // Fix: Ensure `new` is used with `ObjectId`
                isRead: false
            }
        },
        {
            $group: {
                _id: "$isAdmin",
                count: { $sum: 1 }
            }
        }
    ])
    const counts = response.reduce((acc, curr) => {
        if (curr._id === true) {
            acc.userUnreadCount = curr.count;
        } else {
            acc.adminUnreadCount = curr.count;
        }
        return acc;
    }, { adminUnreadCount: 0, userUnreadCount: 0 });

    return counts;
}