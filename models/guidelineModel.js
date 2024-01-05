const { Schema, model } = require('mongoose');
const { GUIDELINE } = require('../utils/constants');

// Guideline Schema
const guidelineSchema = new Schema({
  type: { type: String, enum: Object.values(GUIDELINE), required: true },
  title: { type: String },
  content: { type: String, required: true },
}, { timestamps: true, versionKey: false });

const GuidelineModel = model('Guideline', guidelineSchema);

// create new terms and setting
exports.createGuideline = (obj) => GuidelineModel.create(obj);

// find terms and setting by query
exports.findGuideline = (query) => GuidelineModel.findOne(query)

exports.findAllGuideline = (query) => GuidelineModel.find(query)

// delete guideline 
exports.deleteGuideline = (query) => GuidelineModel.deleteOne(query);
