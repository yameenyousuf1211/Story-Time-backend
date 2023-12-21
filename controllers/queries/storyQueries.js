const { Types } = require("mongoose")

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