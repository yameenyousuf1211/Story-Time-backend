const router = require('express').Router();
const { createCategory, getAllCategories, getRandomCategory } = require('../controllers/categoryController');
const { upload } = require('../utils');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class CategoryAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.post('/', authMiddleware(Object.values(ROLES)), upload('categories').single('image'), createCategory);

        router.get('/', getAllCategories);
        router.get('/random', getRandomCategory)
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/category';
    }
}

module.exports = CategoryAPI;