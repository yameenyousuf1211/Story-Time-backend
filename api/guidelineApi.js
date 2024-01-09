const router = require("express").Router();
const {
    getGuidelines,
    deleteGuideline,
    addGuidelines,
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
