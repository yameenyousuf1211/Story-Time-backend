const { options } = require("joi");

exports.categoryQuery = (parent, search) => {
    let query = { parent, isDeleted: false };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    return query;
};

exports.getCategoriesByLikesQuery = () => {
    return [
        { $match: { parent: { $ne: null }, isDeleted: false } },
        {
            $lookup: {
                from: 'categories',
                localField: 'parent',
                foreignField: '_id',
                as: 'parentCategory'
            }
        },
        { $unwind: '$parentCategory' },
        {
            $lookup: {
                from: 'stories',
                localField: '_id',
                foreignField: 'subCategory',
                as: 'stories'
            }
        },
        {
            $unwind: {
                path: '$stories',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                image: { $first: '$image' },
                parentName: { $first: '$parentCategory.name' },
                totalLikes: { $sum: { $size: { $ifNull: ['$stories.likes', []] } } }
            }
        },
        { $sort: { totalLikes: -1 } }
    ];
};