const express = require('express');
try {
    const a = require("dotenv").config();
    if (a.error) throw a;
} catch (e) {
    console.log(e);
    require("dotenv").config({ path: path.join(__dirname, "../../.env") });
}
const cors = require('cors');
const API = require('./api');
const http = require("http");
const DB_CONNECT = require('./config/dbConnect');
const cookieSession = require('cookie-session');
const { notFound, errorHandler } = require('./middlewares/errorHandling');
const { log } = require('./middlewares/log');
const PORT = process.env.PORT || 3021;
const HOST = process.env.HOST || 'localhost';
const app = express();
DB_CONNECT();

const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use('/uploads', express.static('uploads'));
app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_KEY],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}));

app.use(cors({ origin: "*", credentials: true }));

app.get('/', (req, res) => res.json({ message: `Welcome to the ${process.env.APP_NAME} Project!` }));

app.use(log);
new API(app).registerGroups();
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
});