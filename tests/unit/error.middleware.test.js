require('../setup');

describe('Error middleware', () => {
  const { errorHandler, notFoundHandler } = require('../../middlewares/error.middleware');

  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('errorHandler', () => {
    it('should respond with the error status code and message', () => {
      const err = new Error('Something went wrong');
      err.statusCode = 422;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Something went wrong',
        },
      });
    });

    it('should default to 500 when no status code is set', () => {
      const err = new Error('Internal fail');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('should call next with a 404 error', () => {
      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain('Route not found');
    });
  });
});
