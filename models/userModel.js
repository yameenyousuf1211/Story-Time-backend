const { Schema, model } = require('mongoose');
const { ROLES } = require('../utils/constants');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require('../utils');

// user schema
const userSchema = new Schema({
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    username: { type: String, default: "" },
    countryCode: { type: String, default: null },   // regex like 'PK', 'US'
    phoneCode: { type: String, default: null }, // phoneCode like +92
    phoneNo: { type: String, default: null },
    completePhone: { type: String, select: false },
    email: { type: String, lowercase: true },
    profileImage: { type: String },
    city: { type: String },
    zipCode: { type: String },
    state: { type: String },
    password: { type: String, select: false },
    fcmToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    role: { type: String, default: ROLES.USER, enum: Object.values(ROLES) },
    noOfFollowers: { type: Number, default: 0 },
    noOfFollowings: { type: Number, default: 0 },
    refreshToken: { type: String, select: false },
}, { timestamps: true, versionKey: false });

// pagination plugins
userSchema.plugin(mongoosePaginate);
userSchema.plugin(aggregatePaginate);

// compile model from schema
const UserModel = model('User', userSchema);

// create new user
exports.createUser = (obj) => UserModel.create(obj);

// find user by query
exports.findUser = (query) => UserModel.findOne({ ...query, isDeleted: false });

// update user
exports.updateUser = (query, obj) => UserModel.findOneAndUpdate(query, obj, { new: true });

// get all users
exports.getAllUsers = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: UserModel,
        query,
        page,
        limit,
    });

    return { users: data, pagination };
};

// get FcmToken
exports.getFcmToken = async (userId) => {
    const user = await UserModel.findById(userId).select('fcmToken');
    return user?.fcmToken;
}