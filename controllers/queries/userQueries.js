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
        { $sort: { createdAt: -1 } }    // latest first
    ]
}