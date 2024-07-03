const { generateResponse, asyncHandler } = require('../utils');
const { STATUS_CODES } = require('../utils/constants');
const countryStateCity = require('country-state-city');

exports.DefaultHandler = asyncHandler(async (req, res, next) => {
    generateResponse(null, `${process.env.APP_NAME} API - Health check passed`, res);
});

// get countries
exports.getCountries = asyncHandler(async (req, res, next) => {
    const countries = countryStateCity.Country.getAllCountries();
    generateResponse(countries, 'Countries fetched successfully', res);
});

// get states by country code (iso code)
exports.getStates = asyncHandler(async (req, res, next) => {
    const { countryCode } = req.query;

    if (!countryCode) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide countryCode.'
    });

    const states = countryStateCity.State.getStatesOfCountry(countryCode);
    if (states.length === 0) {
        generateResponse(null, 'States not found', res);
        return;
    }

    generateResponse(states, 'States fetched successfully', res);
});

// get cities by countryCode and stateCode
exports.getCitiesByState = asyncHandler(async (req, res, next) => {
    const { countryCode, stateCode } = req.query;

    if (!countryCode || !stateCode) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide state and country.'
    });

    const cities = countryStateCity.City.getCitiesOfState(countryCode, stateCode);
    if (cities.length === 0) {
        generateResponse(null, 'Cities not found', res);
        return;
    }

    generateResponse(cities, 'Cities fetched successfully', res);
});

exports.uploadMedia = asyncHandler(async (req, res, next) => {
    let media;
    if (req?.files?.media?.length > 0) media = await s3Uploadv3(req.files.media);
    generateResponse(media, 'Media uploaded successfully', res);
});