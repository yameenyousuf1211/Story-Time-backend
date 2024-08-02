const { Schema, model } = require("mongoose");

const otpSchema = new Schema({
  email: { type: String, default: null },
  otp: { type: Number, required: true },
}, { timestamps: true, versionKey: false });

otpSchema.methods.isExpired = function () {
  return Date.now() - this.createdAt > Number(process.env.OTP_EXPIRATION);
}

const OTPModel = model("otp", otpSchema);

// create new OTP
exports.addOTP = (obj) => OTPModel.create(obj);

// find OTP by query
exports.getOTP = (query) => OTPModel.findOne(query);

// delete OTPs
exports.deleteOTPs = (query) => OTPModel.deleteMany(query);