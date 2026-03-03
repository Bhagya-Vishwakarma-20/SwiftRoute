const {logger} = require('../utils/logger')
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    logger.error({
        event: "global_error",
        message: message,
        statusCode,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: err.stack
    });

    res.status(statusCode).json({
        success: false,
        error: {
            message: message,
            ...(process.env.NODE_ENV === 'development' && {
                details: err.details
            })
        }
    });
};

const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
