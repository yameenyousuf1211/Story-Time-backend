const router = require('express').Router();
const { createCategory, getAllCategories, getRandomCategory, deleteCategoryById, getCategories, updateCategory } = require('../controllers/categoryController');
const { upload } = require('../utils');
const authMiddleware = require('../middlewares/auth');
const { ROLES } = require('../utils/constants');

class CategoryAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get('/', getAllCategories);
        router.get('/random', getRandomCategory)
        router.get('/fetch-all', authMiddleware(Object.values(ROLES)), getCategories);
        router.post('/', authMiddleware(Object.values(ROLES)), upload('categories').single('image'), createCategory);
        router.put('/update/:categoryId', authMiddleware(Object.values(ROLES)), upload('categories').single('image'), updateCategory);
        router.delete('/delete/:categoryId', authMiddleware([ROLES.ADMIN]), deleteCategoryById)
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/category';
    }
}

module.exports = CategoryAPI;