const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { object } = require('joi');
const { STORY_TYPE } = require('../middlewares/constants');

const storySchema = new Schema(
    {
        type: { type: String, enum: Object.values(STORY_TYPE), default: "" },
        creator: { type: Schema.Types.ObjectId, ref: 'User' },
        contributors: [{ type: Schema.Types.ObjectId, ref: 'User', default: "" }],
        content: { type: String, default: "" },
        category: { type: Schema.Types.ObjectId, ref: 'Category' },
        subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
        likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: "" }],
        dislikes: [{ type: Schema.Types.ObjectId, ref: 'User', default: "" }],
        isDeleted: { type: Boolean, default: false },

    }, { timestamps: true, versionKey: false }
);

// pagination plugins
storySchema.plugin(mongoosePaginate);
storySchema.plugin(aggregatePaginate);

// compile model from schema
const StoryModel = model('Story', storySchema);


// create new story
exports.createStory = (obj) => StoryModel.create(obj);