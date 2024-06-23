const { getMongoId, lookupUser } = require("../../utils");
const { ROLES } = require("../../utils/constants");

exports.getChatsQuery = async (userId, search = "", role) => {
    const isAdmin = role === ROLES.ADMIN;
    const matchStage = isAdmin ? { chat: { $ne: null } } : { user: getMongoId(userId) };

    return [
        {
            $match: {
                ...matchStage,
                text: { $regex: search, $options: "i" }
            }
        },
        {
            $group: {
                _id: "$chat",
                user: { $first: "$user" },
                unreadMessages: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$isRead", false] },
                                    { $ne: [isAdmin, "$isAdmin"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        { $lookup: { from: "supportchats", localField: "_id", foreignField: "_id", as: "chat" } }, { $unwind: "$chat" },
        { $lookup: { from: "supportmessages", localField: "chat.lastMessage", foreignField: "_id", as: "lastMessage" } },
        { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },
        { $addFields: { "chat.lastMessage": "$lastMessage.text" } },
        ...lookupUser("user"),
        { $sort: { "chat.updatedAt": -1 } },
        {
            $project: {
                _id: 1,
                user: 1,
                unreadMessages: 1,
                chat: {
                    _id: "$chat._id",
                    status: "$chat.status",
                    createdAt: "$chat.createdAt",
                    updatedAt: "$chat.updatedAt",
                    lastMessage: "$chat.lastMessage",
                },
            }
        }
    ];
};

