// Mock newrelic before anything imports it
jest.mock('newrelic', () => ({
  startSegment: jest.fn((name, record, handler) => handler()),
  startBackgroundTransaction: jest.fn(),
  getTransaction: jest.fn(() => ({ end: jest.fn() })),
  noticeError: jest.fn(),
  addCustomAttribute: jest.fn(),
  addCustomAttributes: jest.fn(),
}));

// Mock Redis client
jest.mock('../config/redis.config', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  zAdd: jest.fn(),
  zCard: jest.fn(),
  zRemRangeByScore: jest.fn(),
  expire: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

// Mock RabbitMQ
jest.mock('../lib/rabbitmq', () => ({
  connectRabbitmq: jest.fn(),
  publishToQueue: jest.fn(),
  Queue_name: 'click_analytics',
}));

// Mock Prisma client
jest.mock('../utils/db', () => ({
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  token: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  url: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  click: {
    create: jest.fn(),
  },
}));

// Set environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';
