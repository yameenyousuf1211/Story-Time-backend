const { Schema, model, Types } = require('mongoose');
const { getMongooseAggregatePaginatedData } = require('../utils');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const blockSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    blockId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// pagination plugins
blockSchema.plugin(mongoosePaginate);
blockSchema.plugin(aggregatePaginate);

const BlockModel = model('Block', blockSchema);

// add user to block
exports.blockUser = (obj) => BlockModel.create(obj);

// get block list
exports.getBlockList = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: BlockModel,
        query,
        page,
        limit,
    });
    return { blocksList: data, pagination };
};

// find block
exports.findBlockUser = (query) => BlockModel.findOne(query);

// delete Block User
exports.unblockUser = (query) => BlockModel.deleteOne(query);

// get all blocked users
exports.findBlockedUsers = (query) => BlockModel.find(query);

