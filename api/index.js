const { Router } = require('express');
const rootApi = require('./rootApi');
const AuthAPI = require('./authApi');
const CategoryAPI = require('./categoryApi');
const UserAPI = require('./userApi');
const StoryAPI = require('./storyApi');
const GuidelineAPI = require('./guidelineApi');
const NotificationAPI = require('./notificationApi');

class API {
    constructor(app) {
        this.app = app;
        this.router = Router();
        this.routeGroups = [];
    }

    loadRouteGroups() {
        this.routeGroups.push(new rootApi());
        this.routeGroups.push(new AuthAPI());
        this.routeGroups.push(new CategoryAPI());
        this.routeGroups.push(new UserAPI());
        this.routeGroups.push(new StoryAPI());
        this.routeGroups.push(new GuidelineAPI());
        this.routeGroups.push(new NotificationAPI());
    }

    setContentType(req, res, next) {
        res.set('Content-Type', 'application/json');
        next();
    }

    registerGroups() {
        this.loadRouteGroups();
        this.routeGroups.forEach((rg) => {
            console.log('Route group: ' + rg.getRouterGroup());
            this.app.use('/api' + rg.getRouterGroup(), this.setContentType, rg.getRouter());
        });
    }
}

module.exports = API;