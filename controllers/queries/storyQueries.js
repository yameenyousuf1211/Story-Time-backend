const { Types } = require("mongoose")
const { ROLES } = require("../../utils/constants")

// get all stories
exports.getStoriesQuery = (user) => {
    return [
        { $lookup: { from: "users", localField: "creator", foreignField: "_id", as: "creator" } }, { $unwind: "$creator" },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } }, { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
                likedByMe: { $in: [new Types.ObjectId(user), "$likes"] },
                dislikesByMe: { $in: [new Types.ObjectId(user), "$dislikes"] },
            }
        },
        { $sort: { createdAt: -1 } }    // latest first
    ]
}

// get user's stories
exports.getUserStoriesQuery = (user, type) => {
    return [
        {
            $match: {
                $and: [
                    { contributors: { $in: [new Types.ObjectId(user)] } },
                    { type },
                ]
            }
        },
        { $lookup: { from: "categories", localField: "subCategory", foreignField: "_id", as: "subCategory" } }, { $unwind: "$subCategory" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
            }
        },
        { $sort: { createdAt: -1 } }    // latest first
    ]
}


//Tag Friends in Story
exports.tagFriendsToggleQuery = (user, taggedUserId) => {
    return [
        {
            $match: {
                $and: [
                    { _id: new Types.ObjectId(user) }, // Ensure the current user is the creator
                    { role: { $ne: ROLES.ADMIN } },
                    { isActive: true },
                    { isDeleted: false },
                ]
            }
        },
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), targetId: new Types.ObjectId(taggedUserId) },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$user'] },
                                    { $eq: ['$following', '$$targetId'] },
                                ],
                            },
                        },
                    },
                ],
                as: 'following',
            },
        },
        {
            $addFields: {
                isFollowing: { $cond: [{ $gt: [{ $size: '$following' }, 0] }, true, false] },
            },
        },
       
    ]
}


