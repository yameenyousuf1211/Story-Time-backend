const multer = require('multer');
const fs = require('fs');
const { sign } = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const firebase = require("firebase-admin");
const serviceAccount = require("../firebase.json");
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const serviceAccountKey = require('../serviceAccountKey.json');

const firebaseApp = firebase.initializeApp({ credential: firebase.credential.cert(serviceAccount) });
const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: serviceAccountKey,
});

// Response generation utility
exports.generateResponse = (data, message, res, code = 200) => {
    return res.status(code).json({
        statusCode: code,
        message,
        data,
    });
}


// Body parsing utility
exports.parseBody = (body) => typeof body === 'object' ? body : JSON.parse(body);

// OTP generation utility
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
    if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif|webp|jfif)/i)) {
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
                const uploadPath = `uploads/${folderName}/`;
                fs.mkdirSync(uploadPath, { recursive: true })
                cb(null, uploadPath);
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

// MongoDB ID generation utility
exports.getMongoId = (id = null) => {
    return new mongoose.Types.ObjectId(id);
}

// Mongoose lookup utility for user
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
exports.sendFirebaseNotification = async (title, body, deviceTokens, data) => {
    if (deviceTokens.length <= 0) {
        return;
    }

    const stringData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
    }, {});

    const messages = deviceTokens.map((token) => ({
        notification: {
            title: String(title),
            body: String(body),
        },
        data: stringData,
        token: token,
    }));
    
    console.log('message', { messages });
    try {
        const response = await firebaseApp.messaging().sendEach(messages);
        const invalidTokens = [];
        const sendResponses = response.responses;
        sendResponses.forEach((response, index) => {
            if (response.error) {
                console.error(
                    `Error sending notification to token ${deviceTokens[index]}:`,
                    response.error.code
                );
                if (
                    response.error.code === "messaging/invalid-registration-token" ||
                    response.error.code === "messaging/invalid-argument" ||
                    response.error.code === "messaging/registration-token-not-registered"
                ) {
                    invalidTokens.push(deviceTokens[index]);
                }
            }
        });

        const { removeInvalidTokens } = require('../models/userModel'); // lazy loading to avoid circular dependency 

        if (invalidTokens.length > 0) {
            console.log("invalid tokens", { invalidTokens });
            await removeInvalidTokens(invalidTokens);
        }
        console.log("Successfully sent message:", response);
        return response;
    } catch (error) {
        console.error("Error sending message:", error);
        return error;
    }
};

exports.getAppMetrics = async () => {
    const metrics = ['keyEvents'];
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${process.env.GA_PROPERTY_ID}`,
            dateRanges: [
                {
                    startDate: '2021-01-01',
                    endDate: 'today',
                },
            ],
            metrics: metrics.map(name => ({ name })),
        });

        if (!response.rows || response.rows.length === 0) {
            console.log("No data returned from the API");
            return {};
        }

        const results = response.rows[0].metricValues.reduce((acc, metricValue, index) => {
                acc[metrics[index]] = metricValue.value; 
                return acc;
            }, {}); 

        return results;
    } catch (error) {
        console.error("Error fetching data from Google Analytics API:", error);
    }
}
