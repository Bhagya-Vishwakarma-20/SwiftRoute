require('../setup');

const jwt = require('jsonwebtoken');
const auth = require('../../middlewares/auth.middleware');

describe('Auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should return 401 when no authorization header is present', () => {
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for an invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token';
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Invalid Token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user for a valid token', () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${token}`;
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.username).toBe('testuser');
  });
});
