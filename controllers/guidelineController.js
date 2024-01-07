const { createGuideline, findAllGuideline, deleteGuideline, findGuideline, createOrUpdateGuideline } = require("../models/guidelineModel");
const { parseBody, generateResponse } = require("../utils");
const { addGuidelineValidation, getGuidelineValidation } = require("../validations/guidelineValidation");
const { STATUS_CODES, GUIDELINE } = require("../utils/constants");

//add guidelines 
exports.addGuidelines = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = addGuidelineValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        if (body.type === GUIDELINE.FAQS) {
            if (!body._id) {
                // Create new FAQ
                const faq = await createGuideline(body);
                return generateResponse(faq, 'FAQ created successfully', res);
            } else {
                // Update existing FAQ using _id
                const updatedFaq = await createOrUpdateGuideline({ _id: body._id, type: GUIDELINE.FAQS }, body);
                return generateResponse(updatedFaq, 'FAQ updated successfully', res);
            }
        }

        // For other types (PrivacyPolicy, TermsAndConditions)
        const termsAndPolicy = await createOrUpdateGuideline({ type: body.type }, body);
        generateResponse(termsAndPolicy, `${body.type} created`, res);
    } catch (error) {
        next(error);
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