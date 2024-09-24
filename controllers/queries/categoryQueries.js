const { options } = require("joi");

exports.categoryQuery = (parent, search) => {
    let query = { parent, isDeleted: false };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    return query;
};

exports.getCategoriesByLikesQuery = (month, sortOrder = -1) => {
    return [
        {
            $match: {
                parent: { $ne: null },
                isDeleted: false
            }
        },
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
                let: { categoryId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$subCategory', '$$categoryId'] },
                            isDeleted: false
                        }
                    },
                    {
                        $project: {
                            likesCount: { $size: '$likes' },
                            createdAt: 1
                        }
                    },
                    ...(month ? [
                        {
                            $match: {
                                $expr: { $eq: [{ $month: '$createdAt' }, month] }
                            }
                        }
                    ] : []),
                    {
                        $group: {
                            _id: null,
                            totalLikes: { $sum: '$likesCount' }
                        }
                    }
                ],
                as: 'storyStats'
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                image: 1,
                parentName: '$parentCategory.name',
                totalLikes: {
                    $ifNull: [{ $arrayElemAt: ['$storyStats.totalLikes', 0] }, 0]
                }
            }
        },
        { $sort: { totalLikes: sortOrder } }
    ];
};
