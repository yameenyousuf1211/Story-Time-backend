const { Types } = require("mongoose")

// get all stories
exports.getStoriesQuery = (user) => {
    return [
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), contributorIds: '$contributors' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$user'] },
                                    { $in: ['$following', '$$contributorIds'] }
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
                visibleFollowedContributors: {
                    $filter: {
                        input: '$contributors',
                        as: 'contributor',
                        cond: {
                            $and: [
                                { $in: ['$$contributor', '$followings.following'] },
                                { $not: { $in: ['$$contributor', '$hiddenBy'] } }
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
                isHiddenByMe: { $ne: true }
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