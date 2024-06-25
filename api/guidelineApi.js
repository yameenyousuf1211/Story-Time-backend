const router = require("express").Router();
const {
    getGuidelines,
    deleteGuideline,
    addGuidelines,
    getFAQById,
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
        router.get('/get-faq/:faqId', authMiddleware(Object.values(ROLES)), getFAQById )
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
