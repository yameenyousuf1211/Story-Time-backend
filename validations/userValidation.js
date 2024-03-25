const Joi = require('joi');

exports.checkAvailabilityValidation = Joi.object({
  username: Joi.string().min(3).max(20),
  email: Joi.string().email({ minDomainSegments: 2 }),
  completePhone: Joi.string().regex(/^\+\d*$/).min(7).max(14),
}).or('username', 'email', 'completePhone').xor('username', 'email', 'completePhone');

exports.checkAllAvailabilityValidation = Joi.object({
  username: Joi.string().allow(null, ''),
  email: Joi.string().email({ minDomainSegments: 2 }).allow(null, ''),
  completePhone: Joi.string().regex(/^\+\d*$/).min(7).max(14).allow(null, ''),
});

exports.updateProfileValidation = Joi.object({
  email: Joi.string().email().required(),
  // phone code like +92
  phoneCode: Joi.string().regex(/^\+\d*$/).min(2).max(4).required().messages({
    'string.pattern.base': 'phone code is not valid.',
    'string.min': 'phone code must be at least {#limit} characters long.',
    'string.max': 'phone code must be at most {#limit} characters long.',
    'any.required': 'phone code is required.',
  }),
  // regex like 'PK', 'US' length is 2
  countryCode: Joi.string().regex(/^[A-Z]{2}$/).length(2).required().messages({
    'string.pattern.base': 'country code is not valid.',
    'any.required': 'country code is required.',
  }),
  phoneNo: Joi.string().regex(/^\d*$/).min(7).max(14).required().messages({
    'string.pattern.base': 'phone number is not valid.',
    'string.min': 'phone number must be at least {#limit} characters long.',
    'string.max': 'phone number must be at most {#limit} characters long.',
    'any.required': 'phone number is required.',
  }),
  firstName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).required().messages({
    "string.pattern.base": "First name is not valid.",
    "string.min": "First name must be at least {#limit} characters long.",
    "string.max": "First name must be at most {#limit} characters long.",
    "any.required": "First name is required.",
  }),
  lastName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).required().messages({
    "string.pattern.base": "Last name is not valid.",
    "string.min": "Last name must be at least {#limit} characters long.",
    "string.max": "Last name must be at most {#limit} characters long.",
    "any.required": "Last name is required.",
  }),
  username: Joi.string().min(3).max(20).required(),
  zipCode: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
})

// toggle notifications validation
exports.notificationsToggleValidation = Joi.object({
  key: Joi.string().valid('systemNotification', 'inAppNotifications', 'appVibrations')
}).required();

// get all users validation
exports.getAllUsersValidation = Joi.object({
  limit: Joi.number().min(1).optional(),
  page: Joi.number().min(1).optional(),
  search: Joi.string().optional().allow(null, ''),
  story: Joi.string()
});

exports.reportUserValidation = Joi.object({
  story: Joi.string().required(),
  text: Joi.string().required(),
});

exports.addCardValidation = Joi.object({
  fullName: Joi.string().required(),
  country: Joi.string().required(),
  cardNumber: Joi.number().required(),
  expiryDate: Joi.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/).required(), // MM/YY format
  cvv: Joi.string().min(3).max(3).required()
});

// // get all users validation
// exports.getAllUsersForAdminValidation = Joi.object({
//   limit: Joi.number().min(1).optional(),
//   page: Joi.number().min(1).optional(),
//   search: Joi.string().optional().allow(null, ''),
//   status: Joi.string()
// });

exports.editAdminInfoValidation = Joi.object({
  firstName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).messages({
    "string.pattern.base": "First name is not valid.",
    "string.min": "First name must be at least {#limit} characters long.",
    "string.max": "First name must be at most {#limit} characters long.",
    "any.required": "First name is required.",
  }),
  lastName: Joi.string().regex(/^[a-zA-Z]+[0-9]*$/).min(3).max(30).messages({
    "string.pattern.base": "Last name is not valid.",
    "string.min": "Last name must be at least {#limit} characters long.",
    "string.max": "Last name must be at most {#limit} characters long.",
    "any.required": "Last name is required.",
  }),
  username: Joi.string().min(3).max(20),
  email: Joi.string().email({ minDomainSegments: 2 }),
  password: Joi.string().min(8).max(30),
})
