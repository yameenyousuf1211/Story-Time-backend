const mongoose = require('mongoose');

module.exports = () => {
    mongoose.set('strictQuery', true);
    mongoose.connect(process.env.MONGODB_URL)
        .then(() => console.log('Connected to DB -> ', process.env.MONGODB_URL.split('/')[3]))
        .catch((error) => console.log("db error: ", error));
}
