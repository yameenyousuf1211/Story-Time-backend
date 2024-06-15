const { getMongoId } = require("../../utils");

exports.getChatsQuery = async (user, search = "") => {
    return [
        { $match: { $or: [{ receiver: getMongoId(user) }, { sender: getMongoId(user) }] } },
        {
            $group: {
                _id: "$chat",
                unreadMessages: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ["$receiver", getMongoId(user)] }, { $eq: ["$isRead", false] }] }, 1, 0]
                    }
                }
            },
        },
        // look up chat
        { $lookup: { from: "supportchat", localField: "_id", foreignField: "_id", as: "chat" } }, { $unwind: "$chat" },

        // lookup users under chat
        {
            $lookup: {
                from: "users",
                localField: "chat.users",
                foreignField: "_id",
                as: "users",
            },
        },

        // match users using $regex search
        {
            $match: {
                $or: [
                    { "users.firstName": { $regex: search, $options: "i" } },
                    { "users.lastName": { $regex: search, $options: "i" } },
                ],
            },
        },
        // sort by chat.updatedAt
        { $sort: { "chat.updatedAt": -1 } },
    ];
};
