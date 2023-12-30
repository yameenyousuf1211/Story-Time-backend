const Joi = require('joi');

exports.checkAvailabilityValidation = Joi.object({
  username: Joi.string().min(3).max(20),
  email: Joi.string().email({ minDomainSegments: 2 }),
  completePhone: Joi.string().regex(/^\+\d*$/).min(7).max(14),
}).or('username', 'email', 'completePhone').xor('username', 'email', 'completePhone');
