const { Types } = require("mongoose")

// get all stories
exports.getStoriesQuery = (user) => {
    return [
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), contributorIds: '$contributors', sharedBy: '$sharedBy' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    {
                                        $and: [
                                            { $eq: ['$user', '$$user'] },
                                            { $in: ['$following', '$$contributorIds'] },
                                        ]
                                    },
                                    {
                                        $and: [
                                            { $eq: ['$user', '$$user'] },
                                            { $eq: ['$following', '$$sharedBy'] },
                                        ]
                                    }
                                ]
                            }

                        },
                    },
                ],
                as: 'followings',
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
                likedByMe: { $in: [new Types.ObjectId(user), "$likes"] },
                dislikesByMe: { $in: [new Types.ObjectId(user), "$dislikes"] },
                isFollowing: { $gt: [{ $size: '$followings' }, 0] },
                isHiddenByMe: { $in: [new Types.ObjectId(user), "$hiddenBy"] },
                // filter out contributors who have not hidden the story and are followed by the user
                visibleFollowedContributors: {
                    $filter: {
                        input: '$contributors',
                        as: 'contributors',
                        cond: {
                            $and: [
                                { $in: ['$$contributors', '$followings.following'] },
                                { $not: { $in: ['$$contributors', '$hiddenBy'] } }
                            ]
                        }
                    }
                }
            }
        },
        {
            $match: {
                $or: [
                    { sharedBy: new Types.ObjectId(user) },
                    { contributors: new Types.ObjectId(user) },
                    { tag: new Types.ObjectId(user) },
                    { $expr: { $gt: [{ $size: '$visibleFollowedContributors' }, 0] } }
                ],
                isHiddenByMe: { $ne: true },
                isDeleted: { $ne: true }
            },
        },
        { $lookup: { from: "users", localField: "creator", foreignField: "_id", as: "creator" } },
        { $unwind: "$creator" },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } },
        { $unwind: "$subCategory" },
        { $sort: { createdAt: -1 } },
        { $project: { followings: 0, visibleFollowedContributors: 0, isHiddenByMe: 0 } }
    ]
}

// get user's stories
exports.getUserStoriesQuery = (user, type) => {
    const pipeline = [
        {
            $match: {
                contributors: new Types.ObjectId(user),
                type,
                hiddenBy: { $nin: [new Types.ObjectId(user)] },
                isDeleted: { $ne: true }
            }
        },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } },
        { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
            }
        },
        { $sort: { createdAt: -1 } }
    ];

    return pipeline;
};

exports.fetchHiddenStoriesQuery = (user, type) => {
    return [
        {
            $match: {
                contributors: new Types.ObjectId(user),
                hiddenBy: new Types.ObjectId(user),
                type,
                isDeleted: { $ne: true }
            }
        },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } },
        { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
            }
        },
        { $sort: { createdAt: -1 } }
    ];
}

exports.fetchStoriesByLikesQuery = (month, status) => {
    let query = [
        {
            $match: {
                isDeleted: false
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'creator',
                foreignField: '_id',
                as: 'creator'
            }
        },
        {
            $unwind: '$creator'
        }
    ];

    if (status === 'active' || status === 'inactive') {
        query.push({
            $match: {
                'creator.isActive': status === 'active'
            }
        });
    }

    if (month && month >= 1 && month <= 12) {
        query.push({
            $match: {
                $expr: {
                    $eq: [{ $month: "$createdAt" }, month]
                }
            }
        });
    }

    query = [
        ...query,
        {
            $lookup: {
                from: 'categories',
                localField: 'subCategory',
                foreignField: '_id',
                as: 'category'
            }
        },
        {
            $unwind: '$category'
        },
        {
            $project: {
                _id: 1,
                type: 1,
                category: '$category.name',
                likesCount: { $size: '$likes' },
                'creator._id': 1,
                'creator.firstName': 1,
                'creator.lastName': 1,
                'creator.username': 1,
                'creator.email': 1,
                'creator.isActive': 1,
                'creator.profileImage': 1,
                createdAt: 1,
                updatedAt: 1,
            }
        },
        {
            $sort: { likesCount: -1 }
        }
    ];

    return query;
};
