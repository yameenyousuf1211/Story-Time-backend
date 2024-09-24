const { STATUS_CODES } = require('../utils/constants');
const { parseBody, generateResponse, getRandomIndexFromArray, asyncHandler } = require('../utils/index');
const { createCategory, getAllCategories, findCategory, findCategories, updateCategoryById, updateCategories, fetchAllCategories } = require('../models/categoryModel');
const { createCategoryValidation, updateCategoryValidation } = require('../validations/categoryValidation');
const { Types } = require('mongoose');
const { categoryQuery, getCategoriesByLikesQuery } = require('./queries/categoryQueries');
const { s3Uploadv3 } = require('../utils/s3Upload');

exports.createCategory = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createCategoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message,
    });

    if (!req?.files?.image) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'category image is required!'
    });

    // check if category already exists
    const isCategoryExist = await findCategory({ name: body.name });
    if (isCategoryExist) return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: 'Category already exists',
    });

    // upload image to s3
    [body.image] = await s3Uploadv3(req.files.image);
    const newCategory = await createCategory(body);
    generateResponse(newCategory, 'Category created successfully', res);
});

// Getting All Categories
exports.getAllCategories = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const { parent = null, search = "" } = req.query;

    const query = categoryQuery(parent, search);

    const categoriesData = await getAllCategories({ query, page, limit });
    if (categoriesData?.categories.length === 0) {
        generateResponse(null, 'No categories found', res);
        return;
    }

    generateResponse(categoriesData, `${parent ? 'Sub-' : ''}Categories retrieved successfully`, res);
});

// delete category by id (soft deleted)
exports.deleteCategoryById = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;

    // check if ID is valid
    if (!Types.ObjectId.isValid(categoryId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid category id'
    });

    const category = await findCategory({ _id: categoryId });
    if (!category) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Category not found'
    });

    category.isDeleted = true;
    await category.save();

    // soft delete all sub-categories
    await updateCategories({ parent: categoryId }, { $set: { isDeleted: true } });

    generateResponse(category, 'Category deleted successfully', res);
});

// get A Random Category
exports.getRandomCategory = asyncHandler(async (req, res, next) => {
    const { parent = null } = req.query;
    const query = { parent };

    const categoriesData = await findCategories(query);
    if (categoriesData?.length === 0) {
        generateResponse(null, 'No categories found', res);
        return;
    }

    const index = getRandomIndexFromArray(categoriesData.length);
    generateResponse(categoriesData[index], `Random ${parent ? 'Sub-' : ''}Category retrieved successfully`, res);
});

// fetch categories without pagination
exports.getCategories = asyncHandler(async (req, res, next) => {
    const { parent = null } = req.query;
    const query = { parent, isDeleted: false };

    const categoriesData = await findCategories(query);
    if (categoriesData?.length === 0) {
        generateResponse(null, 'No categories found', res);
        return;
    }

    generateResponse(categoriesData, `${parent ? 'Sub-' : ''}Categories retrieved successfully`, res);
});

// function to update category by id
exports.updateCategory = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;
    const body = parseBody(req.body);

    if (!Types.ObjectId.isValid(categoryId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid category id'
    });

    const { error } = updateCategoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message,
    });

    // check if category already exists
    const category = await findCategory({ _id: categoryId });
    if (!category) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Category not found'
    });

    // upload image to s3 if image is present
    if (req?.files?.image?.length > 0) [body.image] = await s3Uploadv3(req?.files?.image);
    const updateCategory = await updateCategoryById(categoryId, body);
    generateResponse(updateCategory, 'Category updated successfully', res);
});

exports.getCategoryById = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;

    if (!Types.ObjectId.isValid(categoryId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid category id'
    });

    const category = await findCategory({ _id: categoryId });
    if (!category) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Category not found'
    });

    generateResponse(category, 'Category retrieved successfully', res);
});

exports.getCategoriesByLikes = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, sortOrder = '-1' } = req.query;
    const month = parseInt(req.query.month);
    const sortDirection = parseInt(sortOrder) === 1 ? 1 : -1;

    const query = getCategoriesByLikesQuery(month, sortDirection);
    const categoryData = await fetchAllCategories({ query, page, limit });

    generateResponse(categoryData, 'Categories retrieved successfully', res);
});