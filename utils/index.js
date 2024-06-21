const multer = require('multer');
const fs = require('fs');
const { sign } = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const firebase = require("firebase-admin");
const path = require("path");
const pathToServiceAccount = path.resolve('./utils/firebase.json');
const serviceAccount = require(pathToServiceAccount);

// const firebaseApp = firebase.initializeApp({ credential: firebase.credential.cert(serviceAccount) });

exports.generateResponse = (data, message, res, code = 200) => {
    return res.status(code).json({
        statusCode: code,
        message,
        data,
    });
}

exports.parseBody = (body) => {
    let obj;
    if (typeof body === "object") obj = body;
    else obj = JSON.parse(body);
    return obj;
}

exports.generateRandomOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

// generate token
exports.generateToken = (user) => {
    const { JWT_EXPIRATION, JWT_SECRET } = process.env;

    const token = sign({
        id: user._id,
        email: user.email,
        role: user.role,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    return token;
};

// generate refresh token
exports.generateRefreshToken = (user) => {
    const refreshToken = sign({ id: user._id }, process.env.REFRESH_JWT_SECRET, {
        expiresIn: process.env.REFRESH_JWT_EXPIRATION, // Set the expiration time for the refresh token
    });

    return refreshToken;
};

// generate reset token
exports.generateResetToken = (user) => {
    const { RESET_TOKEN_EXPIRATION, JWT_SECRET } = process.env;

    const token = sign({
        id: user._id,
        email: user.email,
        role: user.role,
    }, JWT_SECRET, { expiresIn: RESET_TOKEN_EXPIRATION });

    return token;
};

// aggregate pagination with mongoose paginate library
exports.getMongooseAggregatePaginatedData = async ({
    model, page = 1, limit = 10, query = []
}) => {
    const options = {
        page,
        limit,
        customLabels: {
            totalDocs: 'totalItems',
            docs: 'data',
            limit: 'perPage',
            page: 'currentPage',
            meta: 'pagination',
        },
    };

    const myAggregate = model.aggregate(query);
    const { data, pagination } = await model.aggregatePaginate(myAggregate, options);

    delete pagination?.pagingCounter;

    return { data, pagination };
}

// pagination with mongoose paginate library
exports.getMongoosePaginatedData = async ({
    model, page = 1, limit = 10, query = {}, populate = '', select = '-password', sort = { createdAt: -1 },
}) => {
    const options = {
        select,
        sort,
        populate,
        lean: true,
        page,
        limit,
        customLabels: {
            totalDocs: 'totalItems',
            docs: 'data',
            limit: 'perPage',
            page: 'currentPage',
            meta: 'pagination',
        },
    };

    const { data, pagination } = await model.paginate(query, options);
    delete pagination?.pagingCounter;

    return { data, pagination };
}

// generate filename for uploading
const generateFilename = (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '.' + file.originalname.split('.').pop());
};

// filter image
const filterImage = (req, file, cb) => {
    // check mime type
    if (!file.mimetype.match(/image\/(jpg|JPG|webp|jpeg|JPEG|png|PNG|gif|GIF|jfif|JFIF)/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(null, false);
    }
    cb(null, true);
}

// upload media function
exports.upload = (folderName) => {
    return multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                const path = `uploads/${folderName}/`;
                fs.mkdirSync(path, { recursive: true })
                cb(null, path);
            },

            // By default, multer removes file extensions so let's add them back
            filename: generateFilename
        }),
        limits: { fileSize: 10 * 1024 * 1024 },  // max 10MB //
        fileFilter: filterImage
    })
}

// Function to get a random index from an array
exports.getRandomIndexFromArray = (arrayLength) => Math.floor(Math.random() * arrayLength);

// generate reset token link
exports.generateResetLink = (resetToken) => {
    // You may want to customize the reset link structure based on your requirements
    return `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
};

// async handler
exports.asyncHandler = (requestHandler) => {
    return (req, res, next) => Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
}

exports.getMongoId = (id = null) => {
    return new mongoose.Types.ObjectId(id);
}

exports.lookupUser = (localField = "_id", as = "user", projectMore = {}) => {
    return [
        {
            $lookup: {
                from: "users",
                localField,
                foreignField: "_id",
                as,
                pipeline: [{
                    $project: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        username: 1,
                        profileImage: 1,
                        isActive: 1,
                        isDeleted: 1,
                        ...projectMore
                    },
                }],
            },
        },
        { $unwind: `$${as}` },
    ];
};

// send firebase notification
exports.sendFirebaseNotification = async ({ title, body, token }) => {
    const message = {
        notification: { title, body },
        token,
    };

    try {
        const response = await firebaseApp.messaging().send(message);
        console.log("Successfully sent message:", response);
        return response;
    } catch (error) {
        console.error("Error sending message:", error);
        return error;
    }
};