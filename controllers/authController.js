const {
    generateResponse, parseBody,
    generateRandomOTP, generateToken,
    generateRefreshToken,
    generateResetToken,
    generateResetLink,
    asyncHandler,
    getMongoId } = require('../utils');
const { createUser, findUser, updateUser } = require('../models/userModel');
const { STATUS_CODES, ROLES, AUTH_PROVIDERS } = require('../utils/constants');
const { registerUserValidation, loginUserValidation, sendCodeValidation, codeValidation, resetPasswordValidation, refreshTokenValidation, socialAuthValidation, googleLoginValidation } = require('../validations/authValidation');
const { compare, hash } = require('bcrypt');
const { deleteOTPs, addOTP, getOTP } = require('../models/otpModel');
const { sendEmail } = require('../utils/mailer');
const { addFollowing } = require('../models/followingModel');
const { OAuth2Client } = require('google-auth-library');
const { sign } = require('jsonwebtoken');

// register user
exports.register = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = registerUserValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    body.completePhone = body.phoneCode + body.phoneNo;

    const userWithEmail = await findUser({ email: body.email });
    const userWithPhone = await findUser({ completePhone: body.completePhone });

    if (userWithEmail && userWithPhone) return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: 'Both email and phone already exist'
    });
    else if (userWithEmail) return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: 'Email already exists'
    });
    else if (userWithPhone) return next({
        statusCode: STATUS_CODES.CONFLICT,
        message: 'Phone already exists'
    });
    body.decryptedPassword = body.password;

    // hash password
    const hashedPassword = await hash(body.password, 10);
    body.password = hashedPassword;

    // create user in db
    let user = await createUser(body);

    // follow storyTimeUserEmail account with their email on signup
    const storyTimeUserEmail = await findUser({ email: process.env.STORY_TIME_USER_EMAIL });
    if (storyTimeUserEmail) await addFollowing({ user: user._id, following: storyTimeUserEmail._id });

    // generate access token and refresh token
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    req.session.accessToken = accessToken;

    // update user with refreshToken
    user = await updateUser({ _id: user._id }, { $set: { refreshToken } });
    generateResponse({ user, accessToken, refreshToken }, 'Register successful', res);
});

exports.login = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = loginUserValidation.validate(body)
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    // let user = await findUser({ email: body?.email, role: { $ne: ROLES.ADMIN } }).select('+password');
    let user = await findUser({ email: body?.email }).select('+password');
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Email not found'
    });

    const isMatch = await compare(body.password, user.password);
    if (!isMatch) return next({
        statusCode: STATUS_CODES.UNAUTHORIZED,
        message: 'Invalid password'
    });

    const accessToken = generateToken(user)
    const refreshToken = generateRefreshToken(user)

    req.session.accessToken = accessToken;

    // update user fcmToken
    user = await updateUser({ _id: user._id }, { $set: { fcmToken: body.fcmToken, refreshToken } });
    generateResponse({ user, accessToken, refreshToken }, 'Login Successful', res);
});

// logout user
exports.logout = asyncHandler(async (req, res, next) => {
    req.session = null;
    generateResponse(null, 'Logout successful', res);
});

// send verification code
exports.sendVerificationCode = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = sendCodeValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const { email, phone: completePhone } = body;
    const query = { $or: [{ email }, { completePhone }] };

    const user = await findUser({ ...query, role: ROLES.USER }).select('completePhone email');
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Invalid Information, Record Not Found!'
    });

    // Delete all previous OTPs
    await deleteOTPs(query);

    const otpObj = await addOTP({
        email: user.email,
        completePhone: user.completePhone,
        otp: generateRandomOTP(),
    });

    if (email) {
        await sendEmail({ email, subject: 'Verification Code', message: `Your OTP Code is ${otpObj.otp}` });
    }

    generateResponse({ code: otpObj.otp }, 'Verification Code is Generated Successfully', res);
});

// verify code
exports.verifyCode = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    //Joi Validation
    const { error } = codeValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const otpObj = await getOTP({ otp: body.code })
    if (!otpObj) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Invalid OTP'
    })

    if (otpObj.isExpired()) return next({
        statusCode: STATUS_CODES.BAD_REQUEST,
        message: 'OTP expired'
    });

    const user = await findUser({ $or: [{ email: otpObj.email, completePhone: otpObj.completePhone }] });
    // throw error if user not found via email or phone
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'User not found'
    });

    const accessToken = generateResetToken(user);
    generateResponse({ accessToken }, 'Code is verified successfully', res);
});

// reset password
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const userId = req.user.id
    const body = parseBody(req.body);

    // Joi validation
    const { error } = resetPasswordValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const hashedPassword = await hash(body.newPassword, 10);
    const user = await updateUser({ _id: userId }, { $set: { password: hashedPassword } });
    generateResponse(user, 'Password reset successfully', res);
});

// get refresh token
exports.getRefreshToken = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = refreshTokenValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const user = await findUser({ refreshToken: body.refreshToken }).select('+refreshToken');
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Invalid refresh token'
    });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    req.session.accessToken = accessToken;

    // update refresh token in db
    await updateUser({ _id: user._id }, { $set: { refreshToken } });
    generateResponse({ accessToken, refreshToken }, 'Token refreshed', res);
});

// send reset link
exports.sendResetLink = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = sendCodeValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const { email } = body;
    const user = await findUser({ email, role: ROLES.ADMIN }).select('email resetToken');
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'Invalid Information, Record Not Found!'
    });

    // generate reset token
    const resetToken = generateResetToken(user);

    // generate reset link
    const resetLink = generateResetLink(resetToken);

    // update user resetToken in DB
    user.resetToken = resetToken;
    await user.save();

    // send email
    await sendEmail({
        email: user.email,
        subject: 'Password Reset',
        message: `Click on the following link to reset your password: ${resetLink}`,
    });

    generateResponse(null, 'Reset link sent successfully.', res);
});

// validate social auth ID
exports.validateSocialId = asyncHandler(async (req, res, next) => {
    const { socialAuthId } = req.body;
    if (!socialAuthId) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: 'Social Auth ID is required'
    });

    const user = await findUser({ socialAuthId });
    if (!user) return next({
        statusCode: STATUS_CODES.NOT_FOUND,
        message: 'User does not exist with this social ID'
    });

    generateResponse(user, 'User exists', res);
});

// register with google
exports.registerWithGoogle = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = socialAuthValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    if (!body.email) body.email = null;
    body.completePhone = body.phoneCode + body.phoneNo;
    body.authProvider = AUTH_PROVIDERS.GOOGLE;

    const generateUserId = getMongoId();
    const refreshToken = generateRefreshToken({ _id: generateUserId });

    const user = await createUser({
        _id: generateUserId,
        ...body,
        refreshToken,
    });

    const accessToken = generateToken(user);
    generateResponse({ user, accessToken, refreshToken }, 'Register & Login successful', res);
});

// google login
exports.loginWithGoogle = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = googleLoginValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const user = await findUser({ socialAuthId: body.socialAuthId });
    if (!user.isActive) {
        generateResponse(null, 'Your account is deactivated, please contact admin', res);
        return;
    }

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // update fcmToken & refreshToken
    const updatedUser = await updateUser({ _id: user._id }, { $set: { fcmToken: body.fcmToken, refreshToken } });
    generateResponse({ user: updatedUser, accessToken, refreshToken }, 'Login successfully', res);
});

// register with facebook
exports.registerWithFacebook = asyncHandler(async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = socialAuthValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    if (!body.email) body.email = null;
    body.completePhone = body.phoneCode + body.phoneNo;
    body.authProvider = AUTH_PROVIDERS.FACEBOOK;

    const generateUserId = getMongoId();
    const refreshToken = generateRefreshToken({ _id: generateUserId });

    const user = await createUser({
        _id: generateUserId,
        ...body,
        refreshToken,
    });

    const accessToken = generateToken(user);
    generateResponse({ user, accessToken, refreshToken }, 'Register & Login successful', res);
});

// facebook login (work to do)
exports.loginWithFacebook = asyncHandler(async (req, res, next) => {
    // const { accessToken, fcmToken } = req.body;

    // const { data } = await axios.get(`https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`);
    // // console.log("data >>", data);
    // const [name, email] = [data.name, data.email];

    // try {
    //     const user = await getUserObj({ email });
    //     // if user does not exist then create user
    //     if (!user) {
    //         const tokenObj = {
    //             id: generateId(),
    //             name,
    //             email,
    //             role: role || "USER",
    //         }
    //         const token = sign({ user: tokenObj }, config.app["jwtsecret"], { expiresIn: "1y" });

    //         const userObj = {
    //             _id: tokenObj.id,
    //             name: tokenObj.name,
    //             email: tokenObj.email,
    //             role: tokenObj.role,
    //             fcmToken,
    //             token,
    //             isVerified: true,
    //             isActive: true,
    //         };

    //         const newUser = await createUser(userObj);
    //         return generateResponse(true, "Login successfully", newUser, res);
    //     };

    //     if (!user.isActive) {
    //         generateResponse(false, "Your account is deactivated, please contact admin", null, res);
    //         return;
    //     }

    //     // if user exists then login
    //     const tokenObj = {
    //         id: user._id,
    //         name: user.name,
    //         email: user.email,
    //         role: user.role,
    //     }

    //     const token = sign({ user: tokenObj }, config.app["jwtsecret"], { expiresIn: "1y" });
    //     const updatedUser = await editUser(user._id, { token, fcmToken });

    //     return generateResponse(true, "Login successfully", updatedUser, res);
    // } catch (error) {
    //     console.log(error);
    //     generateResponse(false, "Something went wrong", null, res);
    // }
});

