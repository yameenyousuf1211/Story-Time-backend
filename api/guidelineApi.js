const router = require("express").Router();
const {
    getGuidelines,
    deleteGuideline,
    addGuidelines,
    getFAQById,
    getAllGuidelinesLogs,
} = require("../controllers/guidelineController");
const authMiddleware = require("../middlewares/auth");
const { ROLES } = require("../utils/constants");

class GuidelineAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.get("/", authMiddleware(Object.values(ROLES)), getGuidelines);
        router.get('/logs', authMiddleware([ROLES.ADMIN]), getAllGuidelinesLogs);
        router.get('/faq/:faqId', authMiddleware([ROLES.ADMIN]), getFAQById)
        router.post("/", authMiddleware([ROLES.ADMIN]), addGuidelines);
        router.delete("/:guidelineId", authMiddleware([ROLES.ADMIN]), deleteGuideline);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return "/guideline";
    }
}

module.exports = GuidelineAPI;
