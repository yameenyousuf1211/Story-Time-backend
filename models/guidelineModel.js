const { Schema, model } = require('mongoose');
const { GUIDELINE } = require('../utils/constants');
const { getMongoosePaginatedData } = require('../utils');
const mongoosePaginate = require('mongoose-paginate-v2');

// Guideline Schema
const guidelineSchema = new Schema({
  type: { type: String, enum: Object.values(GUIDELINE), required: true },
  title: { type: String },
  content: { type: String, required: true },
}, { timestamps: true, versionKey: false });

// pagination plugins
guidelineSchema.plugin(mongoosePaginate);

const GuidelineModel = model('Guideline', guidelineSchema);

// create new guideline
exports.createGuideline = (obj) => GuidelineModel.create(obj);

// create or update new guideline
exports.createOrUpdateGuideline = (query, obj) => GuidelineModel.findOneAndUpdate(query, obj, { new: true, upsert: true });

// find terms and setting by query
exports.findGuideline = (query) => GuidelineModel.findOne(query)

exports.findAllGuideline = (query) => GuidelineModel.find(query)

// delete guideline by id
exports.deleteGuidelineById = (id) => GuidelineModel.findByIdAndDelete(id)

// get all guidelines
exports.getAllGuidelines = async ({ query, page, limit }) => {
  const { data, pagination } = await getMongoosePaginatedData({
    model: GuidelineModel,
    query,
    page,
    limit,
    sort: { createdAt: 1 },
  });

  return { guidelines: data, pagination };
};