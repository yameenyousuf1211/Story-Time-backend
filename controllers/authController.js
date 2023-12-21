const {
    generateResponse, parseBody,
    generateRandomOTP, generateToken,
    generateRefreshToken,
    generateResetToken } = require('../utils');
const {
    createUser,
    findUser,
    updateUser,
} = require('../models/userModel');
const { STATUS_CODES, ROLES } = require('../utils/constants');
const { registerUserValidation, loginUserValidation, sendCodeValidation, codeValidation, resetPasswordValidation, refreshTokenValidation } = require('../validations/authValidation');
const { compare, hash } = require('bcrypt');
const { deleteOTPs, addOTP, getOTP } = require('../models/otpModel');
const { sendEmail } = require('../utils/mailer');

// register user
exports.register = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = registerUserValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    body.completePhone = body.phoneCode + body.phoneNo;

    try {
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

        // hash password
        const hashedPassword = await hash(body.password, 10);
        body.password = hashedPassword;

        // create user in db
        const user = await createUser(body);

        // generate access token and refresh token
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        req.session.accessToken = accessToken;

        // update user with refreshToken
        user = await updateUser({ _id: user._id }, { $set: { refreshToken } });
        generateResponse({ user, accessToken, refreshToken }, 'Register successful', res);
    } catch (error) {
        next(error);
    }
}

exports.login = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = loginUserValidation.validate(body)
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        const user = await findUser({ email: body?.email, role: { $ne: ROLES.ADMIN } }).select('+password');
        if (!user) return next({
            statusCode: STATUS_CODES.BAD_REQUEST,
            message: 'Invalid Email or Password'
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
    } catch (error) {
        next(error);
    }
}

// logout user
exports.logout = async (req, res, next) => {
    req.session = null;
    generateResponse(null, 'Logout successful', res);
}

// send verification code
exports.sendVerificationCode = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi Validation
    const { error } = sendCodeValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    const { email, phone: completePhone } = body;
    const query = { $or: [{ email }, { completePhone }] };

    try {
        const user = await findUser(query).select('completePhone email');
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
        } else if (completePhone) {
            console.log(`Your OTP Code is ${otpObj.otp}`);
            // send SMS using twilio
        }

        generateResponse({ code: otpObj.otp }, 'Verification Code is Generated Successfully', res);
    } catch (error) {
        next(error);
    }
};

// verify code
exports.verifyCode = async (req, res, next) => {
    const body = parseBody(req.body);

    //Joi Validation
    const { error } = codeValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
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


    } catch (error) {
        next(error)
    }
}

// reset password
exports.resetPassword = async (req, res, next) => {
    const userId = req.user.id
    const body = parseBody(req.body);

    // Joi validation
    const { error } = resetPasswordValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
        const hashedPassword = await hash(body.newPassword, 10);
        const user = await updateUser({ _id: userId }, { $set: { password: hashedPassword } });
        generateResponse(user, 'Password reset successfully', res);
    } catch (error) {
        next(error);
    }

}

// get refresh token
exports.getRefreshToken = async (req, res, next) => {
    const body = parseBody(req.body);

    // Joi validation
    const { error } = refreshTokenValidation.validate(body);
    if (error) return next({
        statusCode: STATUS_CODES.UNPROCESSABLE_ENTITY,
        message: error.details[0].message
    });

    try {
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
    } catch (error) {
        next(error);
    }
}
