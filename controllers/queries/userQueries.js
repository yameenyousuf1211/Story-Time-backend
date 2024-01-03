const { Types } = require("mongoose")
const { ROLES } = require("../../utils/constants")

// get all users (excluding currentUser & admin)
exports.getUsersQuery = (keyword, user) => {
    return [
        {
            $match: {
                $and: [
                    { _id: { $ne: new Types.ObjectId(user) } },
                    { role: { $ne: ROLES.ADMIN } },
                    { isActive: true },
                    { isDeleted: false },
                    { username: { $regex: keyword, $options: 'i' } },

                ]
            }
        },
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), targetId: '$_id' },
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
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), targetId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$targetId'] },
                                    { $eq: ['$following', '$$user'] },
                                ],
                            },
                        },
                    },
                ],
                as: 'follower',
            },
        },
        {
            $addFields: {
                isFollower: { $cond: [{ $gt: [{ $size: '$follower' }, 0] }, true, false] },
                isFollowing: { $cond: [{ $gt: [{ $size: '$following' }, 0] }, true, false] },
            },
        },
        { $project: { follower: 0, following: 0, refreshToken: 0, password: 0 } },
        { $sort: { isFollowing: -1 } }
        // { $sort: { createdAt: -1 } }    // latest first
    ]
}

//Get All Friends
exports.getFriendsQuery = (keyword, user) => {
    return [
        {
            $match: {
                $and: [
                    { _id: { $ne: new Types.ObjectId(user) } },
                    { role: { $ne: ROLES.ADMIN } },
                    { isActive: true },
                    { isDeleted: false },
                    {
                        $or: [
                            { username: { $regex: keyword, $options: 'i' } }, // Match username if provided
                            { username: { $exists: false } }, // Match all when username is not provided
                        ]
                    },
                ]
            }
        },
        {
            $lookup: {
                from: 'followings',
                let: { user: new Types.ObjectId(user), targetId: '$_id' },
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
        { $project: { follower: 0, following: 0, refreshToken: 0, password: 0 } },
        { $sort: { isFollowing: -1 } },
        {
            $match: {
                isFollowing: true,
            },
        },
    ];
};