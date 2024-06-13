const { getUsers } = require("../../models/userModel");

exports.getChatsQuery = async (query, search) => {
    if (search) {
        const users = await getUsers({
            '$or': [
                { 'firstName': { '$regex': search, '$options': 'i' } },
                { 'lastName': { '$regex': search, '$options': 'i' } }
            ]
        });

        const userIDs = users.map(user => user._id);
        query['user'] = { '$in': userIDs };
    }

    return [
        { $match: query },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
            },
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: 'supportmessages',
                localField: '_id',
                foreignField: 'chat',
                as: 'messages',
            },
        },
        {
            $addFields: {
                unreadMessages: {
                    $size: {
                        $filter: {
                            input: '$messages',
                            as: 'message',
                            cond: { $eq: ['$$message.isRead', false] },
                        },
                    },
                },
            },
        },
        {
            $project: {
                user: {
                    firstName: 1,
                    lastName: 1,
                    username: 1,
                    profileImage: 1,
                },
                lastMessage: 1,
                status: 1,
                unreadMessages: 1,
            },
        },
        { $sort: { updatedAt: -1 } },
    ];
};