const Joi = require('joi');

exports.registerUserValidation = Joi.object({
    // alphabets followed by numbers
    firstName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).required(),
    lastName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).allow(null, ''),
    dob: Joi.string().regex(/^(?:\d{2}|\d{4})-(?:\d{1,2})-(?:\d{1,2})$/).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(30).required(),
    height: Joi.number().min(50).max(250).required(), // 8'2" = 250 cm
    weight: Joi.number().min(50).max(350).required(), // 350 lbs = 158.757 kg
    fcmToken: Joi.string().required(),
    location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2),
    }).default({ type: 'Point', coordinates: [0, 0] }),
    photo: Joi.string().allow(null, ''),
    role: Joi.string().valid('user', 'admin').default('user')
});

exports.loginUserValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(30).required(),
    fcmToken: Joi.string().required(),
});

exports.refreshTokenValidation = Joi.object({
    refreshToken: Joi.string().required(),
})
