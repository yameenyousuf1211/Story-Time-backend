const { Types } = require("mongoose")
const { ROLES } = require("../../utils/constants");
const { getUserById, countUserDocuments, getUsers, aggregateUsers } = require("../../models/userModel");
const { aggregateFollowings, findFollowers } = require("../../models/followingModel");
const { aggregateStories, findStory } = require("../../models/storyModel");

// get all users (excluding currentUser & admin)
exports.getUsersQuery = async (keyword, userId, storyId, page, limit) => {
    const skip = (page - 1) * limit;

    // Prepare the main query
    const matchStage = {
        $match: {
            _id: { $ne: new Types.ObjectId(userId) },
            role: { $ne: ROLES.ADMIN },
            isActive: true,
            isDeleted: false
        }
    };

    if (keyword && keyword.trim() !== '') {
        matchStage.$match.username = { $regex: new RegExp(keyword, 'i') };
    }

    const pipeline = [
        matchStage,
        { $sort: { _id: -1 } }, // Sort by _id to get the latest users first
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'followings',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $and: [{ $eq: ['$user', '$$userId'] }, { $eq: ['$following', new Types.ObjectId(userId)] }] },
                                    { $and: [{ $eq: ['$user', new Types.ObjectId(userId)] }, { $eq: ['$following', '$$userId'] }] }
                                ]
                            }
                        }
                    }
                ],
                as: 'followStatus'
            }
        },
        {
            $lookup: {
                from: 'stories',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$_id', new Types.ObjectId(storyId)] },
                                    { $eq: ['$isDeleted', false] },
                                    { $in: ['$$userId', '$tag'] }
                                ]
                            }
                        }
                    }
                ],
                as: 'taggedStory'
            }
        },
        {
            $addFields: {
                isFollowing: {
                    $cond: [
                        { $gt: [{ $size: { $filter: { input: '$followStatus', cond: { $eq: ['$$this.user', new Types.ObjectId(userId)] } } } }, 0] },
                        true,
                        false
                    ]
                },
                isFollower: {
                    $cond: [
                        { $gt: [{ $size: { $filter: { input: '$followStatus', cond: { $eq: ['$$this.following', new Types.ObjectId(userId)] } } } }, 0] },
                        true,
                        false
                    ]
                },
                isTagged: { $gt: [{ $size: '$taggedStory' }, 0] }
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                role: 1,
                isActive: 1,
                createdAt: 1,
                profileImage: 1,
                isFollowing: 1,
                isFollower: 1,
                isTagged: 1
            }
        }
    ];

    const [users, totalCount] = await Promise.all([
        aggregateUsers(pipeline),
        countUserDocuments(matchStage.$match)
    ]);

    // Sort enriched users
    users.sort((a, b) => {
        if (a.isTagged !== b.isTagged) return b.isTagged ? 1 : -1;
        return b.createdAt - a.createdAt;
    });

    return {
        users,
        totalCount
    };
};


// get all friends
exports.getFriendsQuery = (keyword = "", user) => {
    return [
        {
            $match: {
                $and: [
                    { _id: { $ne: new Types.ObjectId(user) } },
                    { role: { $ne: ROLES.ADMIN } },
                    { isActive: true },
                    { isDeleted: false },
                    ...(keyword && [{ username: { $regex: `^${keyword}$`, $options: "i" } }])
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
