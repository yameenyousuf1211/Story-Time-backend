const { Types } = require("mongoose")

// get all stories
exports.getStoriesQuery = (user) => {
    return [
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), creatorId: '$creator' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$user'] },
                                    { $eq: ['$following', '$$creatorId'] },
                                ],
                            },
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
                isTagged: { $in: [new Types.ObjectId(user), "$tag"] },
            }
        },
        {
            $match: {
                $or: [
                    { isFollowing: true },
                    { isTagged: true },
                    { creator: new Types.ObjectId(user) }
                ],
            },
        },
        { $lookup: { from: "users", localField: "creator", foreignField: "_id", as: "creator" } }, { $unwind: "$creator" },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } }, { $unwind: "$subCategory" },
        { $sort: { createdAt: -1 } },    // latest first
        { $project: { followings: 0 } }
    ]
}

// get user's stories
exports.getUserStoriesQuery = (user, type, isHidden) => {
    const pipeline = [
        {
            $match: {
                creator: new Types.ObjectId(user),
                type,
                ...(!isHidden && { isHidden }) // Only include isHidden if it's true else ignore it
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "subCategory",
                foreignField: "_id",
                as: "subCategory"
            }
        },
        { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
            }
        },
        { $sort: { createdAt: -1 } } // latest first
    ];

    return pipeline;

}
