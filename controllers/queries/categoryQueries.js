const { options } = require("joi");

exports.categoryQuery = (parent, search) => {
    let query = { parent, isDeleted: false };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    return query;
};