require('../setup');

const jwt = require('jsonwebtoken');

describe('JWT service', () => {
  const { generateAccessToken, generateRefreshToken } = require('../../services/jwt.service');

  const mockUser = { id: 1, username: 'testuser' };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should expire in 1 hour', () => {
      const token = generateAccessToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // exp - iat should be 3600 seconds
      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should expire in 7 days', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // exp - iat should be 7 * 24 * 60 * 60 = 604800 seconds
      expect(decoded.exp - decoded.iat).toBe(604800);
    });
  });
});
