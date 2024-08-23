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
                isFollowing: { $cond: [{ $gt: [{ $size: '$followings' }, 0] }, true, false] },
            }
        },
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { isFollowing: true }, // if user is following the contributor or the sharedBy
                            { sharedBy: new Types.ObjectId(user) },
                            { contributors: new Types.ObjectId(user) },
                            { tag: new Types.ObjectId(user) },
                        ],
                    },
                    {
                        $or: [
                            { hiddenBy: { $nin: [new Types.ObjectId(user)] } }
                        ]
                    }
                ]
            },
        },
        { $lookup: { from: "users", localField: "creator", foreignField: "_id", as: "creator" } }, { $unwind: "$creator" },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } }, { $unwind: "$subCategory" },
        { $sort: { createdAt: -1 } },    // latest first
        { $project: { followings: 0 } }
    ]
}

// get user's stories
exports.getUserStoriesQuery = (user, type) => {
    const pipeline = [
        {
            $match: {
                contributors: new Types.ObjectId(user),
                type,
                hiddenBy: { $nin: [new Types.ObjectId(user)] }
            }
        },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } },
        { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
                isHidden: { $in: [new Types.ObjectId(user), "$hiddenBy"] }
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
                type
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