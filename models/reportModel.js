const { Schema, model } = require('mongoose');
const { getMongoosePaginatedData } = require('../utils');
const mongoosePaginate = require('mongoose-paginate-v2');

const reportSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    story: { type: Schema.Types.ObjectId, ref: 'Story' },
    text: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// pagination plugins
reportSchema.plugin(mongoosePaginate);

// compile model from schema
const ReportModel = model('Report', reportSchema);

// create new story
exports.createReport = (obj) => ReportModel.create(obj);

// get story by Id
exports.findReportById = (id) => ReportModel.findById(id);


// find all reports by query with pagination
exports.findReports = async ({ query, page, limit }) => {
    const { data, pagination } = await getMongoosePaginatedData({
        model: ReportModel,
        query,
        page,
        limit,
    });

    return { reports: data, pagination };
}