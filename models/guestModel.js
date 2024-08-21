const { Schema, model } = require('mongoose');

const guestSchema = new Schema({
  guestId: { type: String, },
  fcmToken: { type: String, },
}, { versionKey: false, timestamps: true });

const GuestModel = model('Guest', guestSchema);

exports.getGuestCount = (query) => GuestModel.countDocuments(query);

exports.findGuest = (query) => GuestModel.findOne(query);

exports.createGuest = (obj) => GuestModel.create(obj);