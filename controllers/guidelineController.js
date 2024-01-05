const { createGuideline, findAllGuideline, deleteGuideline, findGuideline } = require("../models/guidelineModel");
const { parseBody, generateResponse } = require("../utils");
const { addGuidelineValidation, getGuidelineValidation } = require("../validations/guidelineValidation");
const { STATUS_CODES } = require("../utils/constants");


exports.addGuidelines = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = addGuidelineValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        const termsAndPolicy = await createGuideline(body);
        if (!termsAndPolicy) {
            return {
                statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
                message: `${body.type} creation failed`,
            };
        }
        generateResponse(termsAndPolicy, `${body.type} created`, res);
    } catch (error) {
        next(error)
    }

}

exports.getGuidelines = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = getGuidelineValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });
    try {
        const guideline = await findAllGuideline(body);
        if (!guideline) {
            return {
                statusCode: STATUS_CODES.NOT_FOUND,
                message: "Guideline not found",
            };
        }

        generateResponse(guideline, `${body.type} Found`, res);


    } catch (error) {
        next(error)
    }
}

exports.deleteGuideline = async (req, res, next) => {
    const { guidelineId } = req.params;

    try {
        // check userId is comment owner
        const guidelineObj = await findGuideline({ _id: guidelineId });
        if (!guidelineObj) return next({
            statusCode: STATUS_CODES.NOT_FOUND,
            message: 'Guideline not found',
        });

        const deleteAGuideline = await deleteGuideline({ _id: guidelineId })
        generateResponse(deleteAGuideline, "guideline deleted successfully", res)
    }
    catch (error) {
        next(error)
    }

}