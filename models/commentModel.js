const { Schema, model } = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { getMongoosePaginatedData } = require("../utils");

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  story: { type: Schema.Types.ObjectId, ref: 'Post' },
  media: [String],
  replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  text: { type: String, default: null },
  parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
}, { timestamps: true, versionKey: false });

commentSchema.plugin(mongoosePaginate);
commentSchema.plugin(aggregatePaginate);

const CommentModel = model("Comment", commentSchema);

// create new comment
exports.createComment = (obj) => CommentModel.create(obj);

// get comment by id
exports.getCommentById = (id) => CommentModel.findById(id);

// update comment by id
exports.updateCommentById = (id, obj) => CommentModel.findByIdAndUpdate(id, obj, { new: true });

// get all comments
exports.getAllComments = async ({ query, page, limit, populate }) => {
  const { data, pagination } = await getMongoosePaginatedData({
    model: CommentModel,
    query,
    page,
    limit,
    populate
  });

  return { comments: data, pagination };
};

// remove comment
exports.removeCommentById = (id) => CommentModel.findByIdAndDelete(id);

exports.countComments = (query) => CommentModel.countDocuments(query)