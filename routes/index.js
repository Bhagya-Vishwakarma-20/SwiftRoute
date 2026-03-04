const express =require('express');
const router = express.Router();
const authRoutes= require('../routes/auth.route');
const apiRoutes = require('../routes/api.route');
const urlRoutes = require('../routes/url.route');
const readmeRoutes = require('../routes/readme.route');

router.use('/', readmeRoutes);
router.use('/auth',authRoutes);
router.use('/api',apiRoutes);
router.use('/url',urlRoutes);

module.exports = router; 