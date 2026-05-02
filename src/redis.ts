import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

export default redis;