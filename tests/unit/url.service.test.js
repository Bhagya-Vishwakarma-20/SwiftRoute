require('../setup');

const db = require('../../utils/db');

describe('URL service', () => {
  const { generateUrl, getTargetUrlFromCode } = require('../../services/url.service');
  const redis = require('../../config/redis.config');

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUrl', () => {
    it('should create a new shortened URL', async () => {
      const mockUrl = {
        id: 1,
        targetUrl: 'https://example.com',
        code: 'abc12345',
        expiresAt: null,
        isActive: true,
      };
      db.url.create.mockResolvedValue(mockUrl);

      const result = await generateUrl('https://example.com', null);
      expect(result).toEqual(mockUrl);
      expect(db.url.create).toHaveBeenCalledWith({
        data: {
          targetUrl: 'https://example.com',
          expiresAt: null,
          code: expect.any(String),
        },
      });
    });

    it('should pass expiry date when provided', async () => {
      const expiresAt = '2026-12-31T00:00:00.000Z';
      const mockUrl = {
        id: 2,
        targetUrl: 'https://example.com',
        code: 'def67890',
        expiresAt,
        isActive: true,
      };
      db.url.create.mockResolvedValue(mockUrl);

      const result = await generateUrl('https://example.com', expiresAt);
      expect(result).toEqual(mockUrl);
      expect(db.url.create).toHaveBeenCalledWith({
        data: {
          targetUrl: 'https://example.com',
          expiresAt,
          code: expect.any(String),
        },
      });
    });

    it('should throw a handled error on DB failure', async () => {
      const err = new Error('DB error');
      err.code = 'P2002';
      db.url.create.mockRejectedValue(err);

      await expect(generateUrl('https://example.com', null)).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('getTargetUrlFromCode', () => {
    it('should return cached URL on cache hit', async () => {
      const cached = JSON.stringify({ targetUrl: 'https://cached.com' });
      redis.get.mockResolvedValue(cached);

      const result = await getTargetUrlFromCode('abc123');
      expect(result).toBe('https://cached.com');
      expect(db.url.findFirst).not.toHaveBeenCalled();
    });

    it('should query DB and cache on cache miss', async () => {
      redis.get.mockResolvedValue(null);
      const mockUrl = { targetUrl: 'https://example.com', expiresAt: null };
      db.url.findFirst.mockResolvedValue(mockUrl);
      redis.set.mockResolvedValue('OK');

      const result = await getTargetUrlFromCode('abc123');
      expect(result).toBe('https://example.com');
      expect(db.url.findFirst).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when URL not found in DB', async () => {
      redis.get.mockResolvedValue(null);
      db.url.findFirst.mockResolvedValue(null);

      const result = await getTargetUrlFromCode('nonexistent');
      expect(result).toBeNull();
    });
  });
});
