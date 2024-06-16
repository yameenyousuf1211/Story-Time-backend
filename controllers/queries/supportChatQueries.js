const { getMongoId, lookupUser } = require("../../utils");

exports.getChatsQuery = async (userId, search = "") => {
    return [
        { $match: { $or: [{ receiver: getMongoId(userId) }, { sender: getMongoId(userId) }] } },
        {
            $group: {
                _id: "$chat",
                unreadMessages: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ["$receiver", getMongoId(userId)] }, { $eq: ["$isRead", false] }] }, 1, 0]
                    }
                }
            },
        },
        // look up chat
        { $lookup: { from: "supportchats", localField: "_id", foreignField: "_id", as: "chat" } }, { $unwind: "$chat" },

        ...lookupUser("chat.users.0", "user1"),
        ...lookupUser("chat.users.1", "user2"),

        // Match users using $regex search only if the user is not the current user
        {
            $match: {
                $or: [
                    {
                        $and: [
                            { "chat.users.0": { $ne: getMongoId(userId) } },
                            { "user1.firstName": { $regex: search, $options: "i" } },
                        ]
                    },
                    {
                        $and: [
                            { "chat.users.0": { $ne: getMongoId(userId) } },
                            { "user1.lastName": { $regex: search, $options: "i" } },
                        ]
                    },
                    {
                        $and: [
                            { "chat.users.1": { $ne: getMongoId(userId) } },
                            { "user2.firstName": { $regex: search, $options: "i" } },
                        ]
                    },
                    {
                        $and: [
                            { "chat.users.1": { $ne: getMongoId(userId) } },
                            { "user2.lastName": { $regex: search, $options: "i" } },
                        ]
                    },
                ],
            },
        },
        // sort by chat.updatedAt
        { $sort: { "chat.updatedAt": -1 } },
    ];
};
