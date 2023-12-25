const { Router } = require('express');
const { createCategory, getAllCategories } = require('../controllers/categoriesController');
const { upload } = require('../utils');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class CategoryAPI {
    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.post('/', authMiddleware(Object.values(ROLES)),
            upload('categories').single('image'), createCategory);

        router.get('/', getAllCategories);

    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/category';
    }
}

module.exports = CategoryAPI;