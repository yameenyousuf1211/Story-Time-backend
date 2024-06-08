exports.categoryQuery = (parent, search) => {
    let query = { parent, isDeleted: false };

    if (search) {
        query.name = { $regex: new RegExp(search, 'i') };
    }

    return query;
};