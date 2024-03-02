const { createGuideline, deleteGuidelineById, findGuideline, createOrUpdateGuideline, getAllGuidelines } = require("../models/guidelineModel");
const { parseBody, generateResponse, asyncHandler } = require("../utils");
const { addGuidelineValidation, getGuidelineValidation } = require("../validations/guidelineValidation");
const { STATUS_CODES, GUIDELINE } = require("../utils/constants");

// add guidelines 
exports.addGuidelines = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = addGuidelineValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    let result, successMessage;

    if (body.type === GUIDELINE.FAQS) {
        result = body.faqId
            ? await createOrUpdateGuideline({ _id: body.faqId, type: GUIDELINE.FAQS }, body)
            : await createGuideline(body);

        successMessage = body.faqId ? 'FAQ updated successfully' : 'FAQ created successfully';
    } else {
        result = await createOrUpdateGuideline({ type: body.type }, body);
        successMessage = `${body.type} created`;
    }

    generateResponse(result, successMessage, res);
});

// get guidelines
exports.getGuidelines = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const { type = null } = req.query;
    const query = { type };

    // Joi Validation
    const { error } = getGuidelineValidation.validate(req.query);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const guideline = await getAllGuidelines({ query, page, limit });
    if (guideline?.guidelines?.length === 0) {
        return generateResponse(null, `No ${type} Found`, res);
    }

    generateResponse(guideline, `${type} Found`, res);
});

// delete guidelines
exports.deleteGuideline = asyncHandler(async (req, res, next) => {
    const { guidelineId } = req.params;

    const guidelineObj = await findGuideline({ _id: guidelineId });
    if (!guidelineObj) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Guideline not found',
    });

    await deleteGuidelineById(guidelineId);
    generateResponse(guidelineObj, "Deleted successfully", res);
});