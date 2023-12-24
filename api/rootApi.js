const router = require('express').Router();
const { DefaultHandler, getCountries, getStates, getCitiesByState } = require('../controllers/rootController');

class RootAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.get('/', DefaultHandler);
        router.get('/countries', getCountries);

        router.get('/states', getStates);
        router.get('/cities', getCitiesByState);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/';
    }
}

module.exports = RootAPI;