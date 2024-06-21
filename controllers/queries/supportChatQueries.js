const { getMongoId, lookupUser } = require("../../utils");
const { ROLES } = require("../../utils/constants");

exports.getChatsQuery = async (userId, search = "", role) => {
    const pipeline = [
        { $match: (role === ROLES.ADMIN) ? { chat: { $ne: null } } : { user: getMongoId(userId) } },
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
        // look up chat
        { $lookup: { from: "supportchats", localField: "_id", foreignField: "_id", as: "chat" } },
        { $unwind: "$chat" },
        ...lookupUser("user"),
        // sort by chat.updatedAt
        { $sort: { "chat.updatedAt": -1 } },
    ];


    if (role === ROLES.ADMIN) {
        pipeline.push({
            $match: {
                $or: [
                    { "user.firstName": { $regex: search, $options: "i" } },
                    { "user.lastName": { $regex: search, $options: "i" } },
                    { "user.username": { $regex: search, $options: "i" } },
                ],
            }
        });
    }

    return pipeline;
};
