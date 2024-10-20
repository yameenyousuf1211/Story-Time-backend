const { Schema, model } = require("mongoose");
const { getMongoosePaginatedData, getMongooseAggregatePaginatedData } = require("../utils");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// category schema
const categorySchema = new Schema({
    name: { type: String },
    image: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isDeleted: { type: Boolean, default: false },
    hexCode: { type: String, default: "" },
}, { timestamps: true, versionKey: false });

// pagination plugins
categorySchema.plugin(mongoosePaginate);
categorySchema.plugin(aggregatePaginate);

// model compile
const CategoryModel = model('Category', categorySchema);

// get all categories
exports.getAllCategories = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: CategoryModel,
        query: { ...query, isDeleted: false },
        page,
        limit,
    });

    return { categories: data, pagination };
};

exports.fetchAllCategories = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: CategoryModel,
        query,
        page,
        limit,
    });

    return { data, pagination };
};

// create new category
exports.createCategory = (obj) => CategoryModel.create(obj);

// find category by query
exports.findCategory = (query) => CategoryModel.findOne({ ...query, isDeleted: false });

// update category by ID
exports.updateCategoryById = (id, obj) => CategoryModel.findByIdAndUpdate(id, { $set: obj }, { new: true });

// find Categories (without pagination)
exports.findCategories = (query) => CategoryModel.find({ ...query, isDeleted: false });

// updateCategories by query
exports.updateCategories = (query, obj) => CategoryModel.updateMany(query, obj);
