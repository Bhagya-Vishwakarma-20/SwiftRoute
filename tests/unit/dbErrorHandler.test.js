const { handleDbError } = require('../../utils/dbErrorHandler');

describe('dbErrorHandler', () => {
  describe('handleDbError', () => {
    it('should map P2002 to 409 Conflict', () => {
      const err = new Error('Prisma error');
      err.code = 'P2002';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(409);
      expect(result.message).toBe('Unique constraint failed');
    });

    it('should map P2025 to 404 Not Found', () => {
      const err = new Error('Prisma error');
      err.code = 'P2025';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('Record not found');
    });

    it('should map P2003 to 400 Bad Request', () => {
      const err = new Error('Prisma error');
      err.code = 'P2003';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Foreign key constraint failed');
    });

    it('should map P2014 to 400 Required relation violation', () => {
      const err = new Error('Prisma error');
      err.code = 'P2014';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Required relation violation');
    });

    it('should map P2012 to 400 Missing required field', () => {
      const err = new Error('Prisma error');
      err.code = 'P2012';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Missing required field');
    });

    it('should map P2023 to 400 Inconsistent column data', () => {
      const err = new Error('Prisma error');
      err.code = 'P2023';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Inconsistent column data');
    });

    it('should default to 500 for unknown error codes', () => {
      const err = new Error('Unknown error');
      err.code = 'P9999';
      const result = handleDbError(err);
      expect(result.statusCode).toBe(500);
    });

    it('should default to 500 when no error code is present', () => {
      const err = new Error('Generic error');
      const result = handleDbError(err);
      expect(result.statusCode).toBe(500);
    });
  });
});
