import { createClient, type RedisClientType } from 'redis';

// Reused across warm serverless invocations so we don't open a new
// connection on every request.
declare global {
  // eslint-disable-next-line no-var
  var __quizRedisClient: RedisClientType | undefined;
}

export async function getRedis(): Promise<RedisClientType> {
  if (!global.__quizRedisClient) {
    global.__quizRedisClient = createClient({ url: process.env.REDIS_URL });
    global.__quizRedisClient.on('error', (err) => {
      console.error('Redis client error', err);
    });
  }
  const client = global.__quizRedisClient;
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

// Rooms auto-expire so abandoned games don't linger in the database forever.
export const ROOM_TTL_SECONDS = 6 * 60 * 60; // 6 hours
