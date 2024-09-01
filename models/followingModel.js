const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongooseAggregatePaginatedData } = require("../utils");

// following schema
const followingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  following: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });

// pagination plugins
followingSchema.plugin(mongoosePaginate);
followingSchema.plugin(aggregatePaginate);

// following model compilation
const FollowingModel = model('Following', followingSchema);

// add follower
exports.addFollowing = (obj) => FollowingModel.create(obj);

// find follower
exports.findFollowing = (query) => FollowingModel.findOne(query);

// delete follower
exports.deleteFollowing = (query) => FollowingModel.deleteOne(query);

// get following list
exports.getFollowerFollowing = async ({ query, page, limit }) => {
  const { data, pagination } = await getMongooseAggregatePaginatedData({
    model: FollowingModel,
    query,
    page,
    limit,
  });

  return { users: data, pagination };
}

exports.findFollowers = (query) => FollowingModel.find(query);

exports.aggregateFollowings = (query) => FollowingModel.aggregate(query);

