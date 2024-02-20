const { Types } = require("mongoose")
const { ROLES } = require("../../utils/constants")

// get all users (excluding currentUser & admin)
exports.getUsersQuery = (keyword, user, story) => {
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
            $lookup: {
                from: 'stories',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $and: [
                                { $expr: { $in: ['$$userId', '$tag'] } },
                                { isDeleted: false },
                                { _id: { $eq: new Types.ObjectId(story) } }, // Match against the provided story _id
                            ],
                        },
                    },
                ],
                as: 'taggedStory',
            },
        },
        {
            $addFields: {
                isFollower: { $cond: [{ $gt: [{ $size: '$follower' }, 0] }, true, false] },
                isFollowing: { $cond: [{ $gt: [{ $size: '$following' }, 0] }, true, false] },
                isTagged: { $cond: [{ $gt: [{ $size: '$taggedStory' }, 0] }, true, false] },
            },
        },
        { $project: { follower: 0, following: 0, refreshToken: 0, password: 0, taggedStory: 0 } },
        { $sort: { isTagged: -1, createdAt: -1 } }, // sort on tagged first then latest
    ]
}

// get all friends
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
                            { username: { $regex: keyword, $options: 'i' } }
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
                as: 'followings',
            },
        },
        { $addFields: { isFollowing: { $cond: [{ $gt: [{ $size: '$followings' }, 0] }, true, false] } } },
        { $match: { isFollowing: true } },
        { $sort: { isFollowing: -1 } },
        { $project: { followings: 0, isFollowing: 0, refreshToken: 0, password: 0 } },
    ];
};

// get list of blocked users
exports.getBlockedUsersQuery = (user) => {
    return [
        { $match: { userId: new Types.ObjectId(user) } },
        {
            $lookup: {
                from: "users",
                localField: "blockId",
                foreignField: "_id",
                as: "blockedUser"
            }
        },
        { $unwind: "$blockedUser" },
        {
            $replaceRoot: {
                newRoot: "$blockedUser"
            }
        }
    ];
};

// get all users for admin
exports.getAllUserQuery = (keyword, user, status) => {
    const matchStage = {
        _id: { $ne: new Types.ObjectId(user) },
        role: { $ne: ROLES.ADMIN },
        isDeleted: false,
        username: { $regex: keyword, $options: 'i' },
    };

    if (status === 'active') {
        matchStage.isActive = true;
    } else if (status === 'inactive') {
        matchStage.isActive = false;
    }

    return [
        { $match: matchStage },
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
            $lookup: {
                from: 'stories',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $and: [
                                { $expr: { $eq: ['$creator', '$$userId'] } },
                                { isDeleted: false },
                                { type: 'text' },
                            ],
                        },
                    },
                ],
                as: 'textStories',
            },
        },
        {
            $lookup: {
                from: 'stories',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $and: [
                                { $expr: { $eq: ['$creator', '$$userId'] } },
                                { isDeleted: false },
                                { type: 'video' },
                            ],
                        },
                    },
                ],
                as: 'videoStories',
            },
        },
        {
            $addFields: {
                textStoriesCount: { $size: '$textStories' },
                videoStoriesCount: { $size: '$videoStories' },
            },
        },
        {
            $unset: ['textStories', 'videoStories'],
        },
        {
            $project: {
                follower: 0,
                following: 0,
                refreshToken: 0,
                password: 0,
            },
        },
        { $sort: { createdAt: -1 } },
    ];
};
