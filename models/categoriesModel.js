const { Schema, model } = require("mongoose");
const { getMongoosePaginatedData } = require("../utils");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// category schema
const categorySchema = new Schema({
    name: { type: String },
    image: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isDeleted: { type: Boolean, default: false },
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
        query,
        page,
        limit,
    });

    return { categories: data, pagination };
};

// create new category
exports.createCategory = (obj) => CategoryModel.create(obj);

// find category by query
exports.findCategory = (query) => CategoryModel.findOne({ ...query, isDeleted: false });

// update category by ID
exports.updateCategoryById = (id, obj) => CategoryModel.findByIdAndUpdate(id, { $set: obj }, { new: true });