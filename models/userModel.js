const { Schema, model } = require('mongoose');
const { ROLES, MODES } = require('../utils/constants');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require('../utils');

const settingSchema = new Schema({
    systemNotification: { type: Boolean, default: false },
    inAppNotifications: { type: Boolean, default: true },
    appVibrations: { type: Boolean, default: true },
}, { versionKey: false, _id: false })

// payment card Schema
const cardSchema = new Schema({
    fullName: { type: String, default: "" },
    country: { type: String, default: "" },
    cardNumber: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    cvv: { type: String, default: "" },
}, { versionKey: false, _id: false })

// user schema
const userSchema = new Schema({
    socialAuthId: { type: String, default: null },
    authProvider: { type: String, default: null },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    username: { type: String, default: "" },
    email: { type: String, lowercase: true, default: null },
    profileImage: { type: String },
    coverImage: { type: String },
    password: { type: String, select: false, default: null },
    decryptedPassword: { type: String, select: false },
    fcmToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    role: { type: String, default: ROLES.USER, enum: Object.values(ROLES) },
    noOfFollowers: { type: Number, default: 0 },
    noOfFollowings: { type: Number, default: 0 },
    refreshToken: { type: String, select: false },
    isPublic: { type: Boolean, default: true },
    settings: { type: settingSchema, default: {} },
    card: { type: cardSchema, default: null },
    resetToken: { type: String, select: false },
    isSubscribed: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

// pagination plugins
userSchema.plugin(mongoosePaginate);
userSchema.plugin(aggregatePaginate);

// compile model from schema
const UserModel = model('User', userSchema);

const guestCountSchema = new Schema({
    count: { type: Number, default: 0 }
}, { versionKey: false, _id: false });

const GuestCountModel = model('GuestCount', guestCountSchema);

exports.createOrUpdateGuestCount = (obj) => GuestCountModel.findOneAndUpdate({}, obj, { new: true, upsert: true });

exports.getGuestCount = () => GuestCountModel.findOne();

// create new user
exports.createUser = (obj) => UserModel.create(obj);

// find user by query
exports.findUser = (query) => UserModel.findOne({ ...query, isDeleted: false });

//get count of total number of users
exports.getUserCount = (query) => UserModel.countDocuments({ ...query });

// update user
exports.updateUser = (query, obj) => UserModel.findOneAndUpdate(query, obj, { new: true });

// get all users (pagination)
exports.getAllUsers = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongooseAggregatePaginatedData({
        model: UserModel,
        query,
        page,
        limit,
    });

    return { users: data, pagination };
};

// get fcm tokens
exports.getFcmTokens = async (ids) => {
    const users = await UserModel.find({ _id: { $in: ids }, isDeleted: false }).select('fcmToken');
    return users?.map(user => user?.fcmToken);
}

// add or update new card
exports.addOrUpdateCard = (query, obj) => UserModel.findOneAndUpdate(query, obj, { new: true, upsert: true });

// delete card (hard delete)
exports.deleteCard = (query) => UserModel.deleteOne(query);

// get all without pagination
exports.getUsers = (query) => UserModel.find({ ...query, isDeleted: false });

exports.getUserById = (id) => UserModel.find(id);