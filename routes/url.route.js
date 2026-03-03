const {generateUrl , redirectCodedUrl} = require('../controlllers/url.controller');
const { slidingWindowLimiter } = require('../middlewares/rateLimiter.middleware');
const router = require('express').Router();
router.post('/' , generateUrl)
router.get('/:code' , slidingWindowLimiter,redirectCodedUrl);

module.exports = router;