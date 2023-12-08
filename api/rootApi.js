'use strict';

const { Router } = require('express')
const { DefaultHandler } = require('../controller/rootController');

class RootAPI {
    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    setupRoutes() {
        let router = this.router;
        router.get('/', DefaultHandler);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/';
    }
}

module.exports = RootAPI;