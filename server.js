const path = require('path');
try {
    const a = require("dotenv").config();
    if (a.error) throw a;
} catch (e) {
    console.log(e);
    require("dotenv").config({ path: path.join(__dirname, "../../.env") });
}
const express = require('express');
const cors = require('cors');
const API = require('./api');
const http = require("http");
const DB_CONNECT = require('./config/dbConnect');
const cookieSession = require('cookie-session');
const { notFound, errorHandler } = require('./middlewares/errorHandling');
const { log } = require('./middlewares/log');
const { Server } = require("socket.io");
const { initializeSocketIO } = require('./socket');
const PORT = process.env.PORT || 3021;
const app = express();
DB_CONNECT();

const httpServer = http.createServer(app);

// initialize socket.io
const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: "*",
        credentials: true,
    },
});

// mount io to app
app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_KEY],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}));

app.use(cors({
    origin: ["http://localhost:3000", "https://story-time4.vercel.app"], credentials: true
}));

app.get('/', (req, res) => res.json({ message: `Welcome to the ${process.env.APP_NAME} Project` }));

app.use(log);
new API(app).registerGroups();

initializeSocketIO(io);

app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
});