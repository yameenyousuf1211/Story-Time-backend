const Joi = require('joi');

exports.resetPasswordValidation = Joi.object({
    password: Joi.string().min(8).max(30).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
});

exports.changePasswordValidation = Joi.object({
    oldPassword: Joi.string().min(8).max(30).required(),
    newPassword: Joi.string().min(8).max(30).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

exports.updateProfileValidation = Joi.object({
    // alphabets followed by numbers
    firstName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).required(),
    lastName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).allow(null, ''),
    // dob: Joi.date().custom(validateDate, 'custom date validation').required()
    dob: Joi.string().regex(/^(?:\d{2}|\d{4})-(?:\d{1,2})-(?:\d{1,2})$/).required(),
});
