exports.ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

exports.STATUS_CODES = Object.freeze({
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
});

// types for story
exports.STORY_TYPES = Object.freeze({
  TEXT: 'text',
  VIDEO: 'video',
});

exports.MODES = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

exports.GUIDELINE = Object.freeze({
  PRIVACY_POLICY: 'PrivacyPolicy',
  TERMS_AND_CONDITIONS: 'TermsAndConditions',
  FAQS: 'FAQs',
  ABOUT_US: 'AboutUs'
});

exports.SUPPORT_CHAT_STATUS = Object.freeze({
  ONGOING: 'ongoing',
  CLOSED: 'closed',
  PENDING: 'pending'
});

exports.AUTH_PROVIDERS = Object.freeze({
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
});
