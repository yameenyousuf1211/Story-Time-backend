exports.getUsersQuery = (keyword) => {
    return [
        {
            $match: {
                $and: [
                    // { _id: { $ne: Types.ObjectId(user) } },
                    { isActive: true },
                    { isDeleted: false },
                    { username: { $regex: keyword, $options: 'i' } },

                ]
            }
        },
        { $sort: { createdAt: -1 } }
    ]
}