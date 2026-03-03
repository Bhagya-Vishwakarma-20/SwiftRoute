const redis = require("../config/redis.config");
const { logger } = require("../utils/logger");

const WINDOW_SIZE = 60; 
const MAX_REQUESTS = 200;

const slidingWindowLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE * 1000;

    // Remove old requests
    await redis.zRemRangeByScore(key, 0, windowStart);

    // Count remaining requests
    const requestCount = await redis.zCard(key);

    if (requestCount >= MAX_REQUESTS) {
      logger.warn({
        event: "rate_limit_triggered",
        ip,
        path: req.originalUrl
      });
      console.log("rate_limit_triggered");

      return res.status(429).json({
        message: "Too many requests"
      });
    }

    await redis.zAdd(key, {
      score: now,
      value: `${now}-${Math.random()}`
    });

    await redis.expire(key, WINDOW_SIZE);

    next();
  } catch (err) {
    logger.error({
      event: "rate_limit_error",
      message: err.message
    });
    next(); 
  }
};

module.exports = {slidingWindowLimiter}