const Router = require('express').Router;
const authController = require('../controlllers/auth.controller');
const router = Router();
router.post('/signin',authController.signin);
router.post('/signup',authController.signup);
router.post('/refresh-token',authController.refreshToken);
module.exports = router;