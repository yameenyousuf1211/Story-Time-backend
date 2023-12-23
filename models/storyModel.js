const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { STORY_TYPES } = require('../utils/constants');
const { getMongooseAggregatePaginatedData } = require('../utils');

const storySchema = new Schema({
    type: { type: String, enum: Object.values(STORY_TYPES) },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    contributors: { type: [{ type: Schema.Types.ObjectId, ref: 'User', }], default: [] },
    content: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    likes: { type: [{ type: Schema.Types.ObjectId, ref: 'User', }], default: [] },
    dislikes: { type: [{ type: Schema.Types.ObjectId, ref: 'User', }], default: [] },
    commentsCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

// pagination plugins
storySchema.plugin(mongoosePaginate);
storySchema.plugin(aggregatePaginate);

// compile model from schema
const StoryModel = model('Story', storySchema);

// create new story
exports.createStory = (obj) => StoryModel.create(obj);

// get all stories
exports.getAllStories = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: StoryModel,
        query,
        page,
        limit,
    });

    return { stories: data, pagination };
};

// find story by ID
exports.findStoryById = (id) => StoryModel.findById(id);