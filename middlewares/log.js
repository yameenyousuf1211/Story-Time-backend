'use strict';

const moment = require("moment");

class Log {
    static log(req, res, next) {
        console.log("\n\n<<<< Date & Time >>>>", moment().utcOffset("+0500").format("DD-MMM-YYYY hh:mm:ss a"));
        console.log("req.originalUrl: ", req.originalUrl);
        console.log("req.body: ", JSON.stringify(req.body));
        next();
    }
}

module.exports = Log;
