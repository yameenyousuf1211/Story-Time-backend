const router = require('express').Router();
const { createCategory, getAllCategories, getRandomCategory, deleteCategoryById, getCategories, updateCategory, getCategoryById, getCategoriesByLikes } = require('../controllers/categoryController');
// const { upload } = require('../utils');
const { upload } = require("../utils/s3Upload");
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
        router.get('/likes', authMiddleware([ROLES.ADMIN]), getCategoriesByLikes)
        router.get('/:categoryId', getCategoryById);
        router.post('/', authMiddleware(Object.values(ROLES)), upload.fields([{ name: 'image', maxCount: 1 }]), createCategory);
        router.put('/update/:categoryId', authMiddleware(Object.values(ROLES)), upload.fields([{ name: 'image', maxCount: 1 }]), updateCategory);
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