const winston = require('winston');
const {format,transports} = require('../config/winston.config');
exports.logger = winston.createLogger({
    level:'info',
    format,
    transports ,
    defaultMeta: { service: 'url-shortener-api' },
})  
