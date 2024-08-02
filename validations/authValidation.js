const Joi = require('joi');
const { ROLES } = require('../utils/constants');

// register user validation
exports.registerUserValidation = Joi.object({
    email: Joi.string().email().required(),
    // phone code like +92
    phoneCode: Joi.string().regex(/^\+\d*$/).min(2).max(4).required().messages({
        'string.pattern.base': 'phone code is not valid.',
        'string.min': 'phone code must be at least {#limit} characters long.',
        'string.max': 'phone code must be at most {#limit} characters long.',
        'any.required': 'phone code is required.',
    }),
    phoneNo: Joi.string().regex(/^\d*$/).min(7).max(14).required().messages({
        'string.pattern.base': 'phone number is not valid.',
        'string.min': 'phone number must be at least {#limit} characters long.',
        'string.max': 'phone number must be at most {#limit} characters long.',
        'any.required': 'phone number is required.',
    }),
    fcmToken: Joi.string().required(),
    role: Joi.string().valid(...Object.values(ROLES)).required(),
    firstName: Joi.string().regex(/^[a-zA-Z\s]+[0-9\s]*$/).min(1).max(30).required().messages({
        "string.pattern.base": "First name is not valid.",
        "string.min": "First name must be at least {#limit} characters long.",
        "string.max": "First name must be at most {#limit} characters long.",
        "any.required": "First name is required.",
    }),
    lastName: Joi.string().regex(/^[a-zA-Z\s]+[0-9\s]*$/).min(1).max(30).required().messages({
        "string.pattern.base": "Last name is not valid.",
        "string.min": "Last name must be at least {#limit} characters long.",
        "string.max": "Last name must be at most {#limit} characters long.",
        "any.required": "Last name is required.",
    }),
    username: Joi.string().min(1).max(20).required(),
    zipCode: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    password: Joi.string().min(8).max(30).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
        'any.only': 'Confirm password does not match with password.',
        'any.required': 'Confirm password is required.',
    })
});

// login user validation
exports.loginUserValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(30).required(),
    fcmToken: Joi.string().required(),
});

// send code validation
exports.sendCodeValidation = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }),
    phone: Joi.string().regex(/^\+\d*$/).min(7).max(14).messages({
        'string.pattern.base': 'phone number is not valid.',
        'string.min': 'phone number must be at least {#limit} characters long.',
        'string.max': 'phone number must be at most {#limit} characters long.',
        'any.required': 'phone number is required.',
    }),
}).xor('email', 'phone');

exports.codeValidation = Joi.object({
    code: Joi.string().min(6).max(6).required(),
});

// reset password validation
exports.resetPasswordValidation = Joi.object({
    newPassword: Joi.string().min(8).max(30).required(),
    confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
        'any.only': 'Confirm password does not match with new password.',
        'any.required': 'Confirm password is required.',
    })
});

// refresh token validation
exports.refreshTokenValidation = Joi.object({
    refreshToken: Joi.string().required(),
});

// social auth validation
exports.socialAuthValidation = Joi.object({
    socialAuthId: Joi.string().required(),
    email: Joi.string(),
    // phone code like +92
    phoneCode: Joi.string().regex(/^\+\d*$/).min(2).max(4).required().messages({
        'string.pattern.base': 'phone code is not valid.',
        'string.min': 'phone code must be at least {#limit} characters long.',
        'string.max': 'phone code must be at most {#limit} characters long.',
        'any.required': 'phone code is required.',
    }),
    phoneNo: Joi.string().regex(/^\d*$/).min(7).max(14).required().messages({
        'string.pattern.base': 'phone number is not valid.',
        'string.min': 'phone number must be at least {#limit} characters long.',
        'string.max': 'phone number must be at most {#limit} characters long.',
        'any.required': 'phone number is required.',
    }),
    fcmToken: Joi.string().required(),
    firstName: Joi.string().regex(/^[a-zA-Z\s]+[0-9\s]*$/).min(1).max(30).required().messages({
        "string.pattern.base": "First name is not valid.",
        "string.min": "First name must be at least {#limit} characters long.",
        "string.max": "First name must be at most {#limit} characters long.",
        "any.required": "First name is required.",
    }),
    lastName: Joi.string().regex(/^[a-zA-Z\s]+[0-9\s]*$/).min(1).max(30).required().messages({
        "string.pattern.base": "Last name is not valid.",
        "string.min": "Last name must be at least {#limit} characters long.",
        "string.max": "Last name must be at most {#limit} characters long.",
        "any.required": "Last name is required.",
    }),
    username: Joi.string().min(1).max(20).required(),
    zipCode: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required()
});

// google login validation
exports.socialLoginValidation = Joi.object({
    socialAuthId: Joi.string().required(),
    fcmToken: Joi.string().required(),
});