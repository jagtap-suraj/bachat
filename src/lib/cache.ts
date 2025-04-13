import { Redis } from "@upstash/redis";

// Initialize Redis client using the same credentials as rate limiting
let redis: Redis | undefined;

try {
  // Only initialize if environment variables are available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error("Failed to initialize Redis cache:", error);
}

/**
 * Default cache TTL (time-to-live) in seconds
 * 300 seconds = 5 minutes
 */
const DEFAULT_CACHE_TTL = 300;

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  
  try {
    const data = await redis.get(key);
    return data as T;
  } catch (error) {
    console.error("Error getting data from cache:", error);
    return null;
  }
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time-to-live in seconds (default: 5 minutes)
 * @returns true if successful, false otherwise
 */
export async function setCache<T>(
  key: string, 
  data: T, 
  ttl: number = DEFAULT_CACHE_TTL
): Promise<boolean> {
  if (!redis) return false;
  
  try {
    await redis.set(key, data, { ex: ttl });
    return true;
  } catch (error) {
    console.error("Error setting data in cache:", error);
    return false;
  }
}

/**
 * Remove data from cache
 * @param key Cache key
 * @returns true if successful, false otherwise
 */
export async function invalidateCache(key: string): Promise<boolean> {
  if (!redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return false;
  }
}

/**
 * Creates a cache key for a user's data
 * @param userId User ID
 * @param resource Resource name (e.g., "dashboard", "transactions")
 * @param params Optional parameters
 * @returns Cache key
 */
export function createCacheKey(
  userId: string,
  resource: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
): string {
  const paramsString = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  return `bachat:${userId}:${resource}${paramsString ? `:${paramsString}` : ''}`;
}

/**
 * Cached function wrapper
 * @param fn Function to cache
 * @param keyFn Function to generate cache key
 * @param ttl Time-to-live in seconds
 * @returns Cached function
 */
export function withCache<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyFn: (...args: Args) => string,
  ttl: number = DEFAULT_CACHE_TTL
) {
  return async (...args: Args): Promise<T> => {
    const cacheKey = keyFn(...args);
    
    // Try to get data from cache first
    const cachedData = await getCache<T>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // If not in cache, call the original function
    const data = await fn(...args);
    
    // Cache the result
    await setCache(cacheKey, data, ttl);
    
    return data;
  };
} 