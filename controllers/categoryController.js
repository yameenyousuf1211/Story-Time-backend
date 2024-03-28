const { STATUS_CODES } = require('../utils/constants');
const { parseBody, generateResponse, getRandomIndexFromArray, asyncHandler } = require('../utils/index');
const { createCategory, getAllCategories, findCategory, findCategories, updateCategoryById } = require('../models/categoryModel');
const { createCategoryValidation, updateCategoryValidation } = require('../validations/categoryValidation');
const { Types } = require('mongoose');

exports.createCategory = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = createCategoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message,
    });

    // check if image is uploaded, throw error
    if (!req.file) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please upload image',
    });

    body.image = req.file.path;

    const isCategoryExist = await findCategory({ name: body.name, isDeleted: false });
    if (isCategoryExist) return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: 'Category already exists',
    });

    const newCategory = await createCategory(body);
    generateResponse(newCategory, 'Category created successfully', res);
});

// Getting All Categories
exports.getAllCategories = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const { parent = null } = req.query;
    const query = { parent, isDeleted: false };

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
    const body = parseBody(req.body);

    if (!Types.ObjectId.isValid(body.categoryId)) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'invalid category id'
    });
    const { error } = updateCategoryValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message,
    });

    const category = await findCategory({ _id: body.categoryId });
    if (!category) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Category not found'
    });
    if (req.file) body.image = req.file.path;

    const updateCategory = await updateCategoryById(body.categoryId, body);

    generateResponse(updateCategory, 'Category updated successfully', res);
});
