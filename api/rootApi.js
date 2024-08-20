const router = require('express').Router();
const { DefaultHandler, getCountries, getStates, getCitiesByState, uploadMedia,downloadImage } = require('../controllers/rootController');
const { upload } = require('../utils/s3Upload');

class RootAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        const router = this.router;

        router.get('/', DefaultHandler);
        router.get('/countries', getCountries);

        router.get('/states', getStates);
        router.get('/cities', getCitiesByState);

        router.post('/upload-media', upload.fields([{ name: "media", maxCount: 5 }]), uploadMedia);
        router.post('/image-download',downloadImage);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/';
    }
}

module.exports = RootAPI;