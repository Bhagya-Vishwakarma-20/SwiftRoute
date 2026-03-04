require('../setup');

const redis = require('../../config/redis.config');

describe('Sliding window rate limiter', () => {
  const { slidingWindowLimiter } = require('../../middlewares/rateLimiter.middleware');

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { ip: '127.0.0.1', originalUrl: '/url/abc123' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should allow request when under rate limit', async () => {
    redis.zRemRangeByScore.mockResolvedValue(0);
    redis.zCard.mockResolvedValue(5);
    redis.zAdd.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);

    await slidingWindowLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block request when rate limit is exceeded', async () => {
    redis.zRemRangeByScore.mockResolvedValue(0);
    redis.zCard.mockResolvedValue(200); // MAX_REQUESTS

    await slidingWindowLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ message: 'Too many requests' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next on Redis error (fail-open)', async () => {
    redis.zRemRangeByScore.mockRejectedValue(new Error('Redis connection failed'));

    await slidingWindowLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
