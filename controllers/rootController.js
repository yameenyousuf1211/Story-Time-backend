const { generateResponse, asyncHandler } = require('../utils');
const { STATUS_CODES } = require('../utils/constants');
const countryStateCity = require('country-state-city');
const { s3Uploadv3, config } = require('../utils/s3Upload');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

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
    if (!req?.files?.media) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide media files.'
    });

    const media = await s3Uploadv3(req.files.media);
    generateResponse(media, 'Media uploaded successfully', res);
});

exports.downloadImage = asyncHandler(async (req, res, next) => {
    const { key } = req.params;

    const s3 = new S3Client(config());
  
    try {
        const data = await s3.send(new GetObjectCommand({Bucket: process.env.AWS_BUCKET_NAME, Key: key}));
     
        res.setHeader('Content-Type', data.ContentType); 
        res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`); 

        data.Body.pipe(res);
    } catch (error) {
        next({
            statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
            message: 'Error fetching image from S3',
        });
    }
});