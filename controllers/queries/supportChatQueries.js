const { getMongoId, lookupUser } = require("../../utils");
const { ROLES } = require("../../utils/constants");

exports.getChatsQuery = async (userId, search = "", role) => {
    const matchStage = (role === ROLES.ADMIN) ? { chat: { $ne: null } } : { user: getMongoId(userId) };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: "$chat",
                user: { $first: "$user" },
                unreadMessages: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$isAdmin", true] },
                            then: { $cond: { if: { $eq: ["$isRead", false] }, then: 1, else: 0 } },
                            else: 0,
                        }
                    }
                }
            }
        },
        { $lookup: { from: "supportchats", localField: "_id", foreignField: "_id", as: "chat" } },
        { $unwind: "$chat" },
        { $lookup: { from: "supportmessages", localField: "chat.lastMessage", foreignField: "_id", as: "lastMessage" } },
        { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },
        { $addFields: { "chat.lastMessage": "$lastMessage.text" } },
        ...lookupUser("user"),
        { $sort: { "chat.updatedAt": -1 } }
    ];

    // Add message filtering based on search term
    if (search) {
        pipeline.push(
            { $lookup: { from: "supportmessages", localField: "_id", foreignField: "chat", as: "filteredMessages" } },
            {
                $match: { "filteredMessages.text": { $regex: search, $options: "i" } }
            }
        );
    }
    // Final projection stage
    pipeline.push(
        {
            $project: {
                _id: 1,
                user: 1,
                unreadMessages: 1,
                chat: {
                    _id: "$chat._id",
                    user: "$chat.user",
                    status: "$chat.status",
                    createdAt: "$chat.createdAt",
                    updatedAt: "$chat.updatedAt",
                    lastMessage: "$chat.lastMessage",
                    unreadMessages: "$chat.unreadMessages"
                },
            }
        }
    );

    return pipeline;
};

