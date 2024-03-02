const mongoose = require('mongoose');
const colors = require('colors');

module.exports = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB Connected -> : ${conn.connection.name}`.magenta.bold);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1);
    }
}
