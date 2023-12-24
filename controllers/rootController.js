const { generateResponse } = require('../utils');
const { STATUS_CODES } = require('../utils/constants');
const countryStateCity = require('country-state-city');

exports.DefaultHandler = (req, res, next) => {
    generateResponse(null, `Welcome to the ${process.env.APP_NAME} - API`, res);
};

// get countries
exports.getCountries = (req, res, next) => {
    try {
        const countries = countryStateCity.Country.getAllCountries();
        generateResponse(countries, 'Countries fetched successfully', res);
    } catch (error) {
        next(error);
    }
}

// get states by country code (iso code)
exports.getStates = (req, res, next) => {
    const { countryCode } = req.query;

    if (!countryCode) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide countryCode.'
    });

    try {
        const states = countryStateCity.State.getStatesOfCountry(countryCode);
        if (states.length === 0) {
            generateResponse(null, 'States not found', res);
            return;
        }

        generateResponse(states, 'States fetched successfully', res);
    } catch (error) {
        next(error);
    }
}

// get cities by countryCode and stateCode
exports.getCitiesByState = (req, res, next) => {
    const { countryCode, stateCode } = req.query;

    if (!countryCode || !stateCode) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Please, provide state and country.'
    });

    try {
        const cities = countryStateCity.City.getCitiesOfState(countryCode, stateCode);
        if (cities.length === 0) {
            generateResponse(null, 'Cities not found', res);
            return;
        }

        generateResponse(cities, 'Cities fetched successfully', res);
    } catch (error) {
        next(error);
    }
}