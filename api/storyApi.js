const router = require('express').Router();
const {
    fetchAllStories,
    createStory,
    fetchUserStories,
    fetchStoryById,
    likeStoryToggle,
    dislikeStoryToggle,
    removeCommentOnPost,
    getCommentsOfStory,
    addCommentOnStory,
    tagFriendsToggle,
} = require('../controllers/storyController');
const authMiddleware = require('../middlewares/auth');
const { upload } = require('../utils');
const { ROLES } = require('../utils/constants');

class StoryAPI {
    constructor() {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        router.get('/', authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchAllStories);
        router.get('/user', authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchUserStories);
        router.get("/:storyId", authMiddleware([ROLES.USER, ROLES.ADMIN]), fetchStoryById);
        
        router.post('/', authMiddleware([ROLES.USER]), createStory);
        
        router.put('/like/:storyId', authMiddleware([ROLES.USER]), likeStoryToggle);
        router.put('/dislike/:storyId', authMiddleware([ROLES.USER]), dislikeStoryToggle);
        
        router.get('/comments/:storyId', authMiddleware(Object.values(ROLES)), getCommentsOfStory);
        
        router.post('/add-comment', authMiddleware(Object.values(ROLES)),
        upload('comments').single('media'),
        //  upload.fields([{ name: "media", maxCount: 5 }]),
        addCommentOnStory);
        
        router.delete('/remove-comment/:commentId', authMiddleware(Object.values(ROLES)), removeCommentOnPost);
        router.put('/tag-friends',authMiddleware([ROLES.USER]),tagFriendsToggle)
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/story';
    }
}

module.exports = StoryAPI;
