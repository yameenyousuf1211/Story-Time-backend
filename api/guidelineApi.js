const router = require("express").Router();
const {
    getGuidelines,
    deleteGuideline,
    addGuidelines,
} = require("../controllers/guidelineController");
const authMiddleware = require("../middlewares/Auth");
const { ROLES } = require("../utils/constants");

class GuidelineAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get("/", getGuidelines);
        router.post("/", addGuidelines);
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
