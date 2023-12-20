const { Schema, model, Types } = require('mongoose');
const { ROLES } = require('../utils/constants');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const postSchema = new Schema(
    {
        type: { type: String, default: "" },
        creator: { type: Schema.Types.ObjectId, ref: 'User' },
        contributors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        content: { type: String, default: "" },
        category: { type: Schema.Types.ObjectId, ref: 'Category' },
        likes: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        dislikes: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        isDeleted: { type: Boolean, default: false },

    }, { timestamps: true, versionKey: false }
);

// pagination plugins
postSchema.plugin(mongoosePaginate);
postSchema.plugin(aggregatePaginate);

// compile model from schema
const PlayFlowModel = model('PlayFlow', postSchema);


// create new user
exports.createStory = (obj) => PlayFlowModel.create(obj);