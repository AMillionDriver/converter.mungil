export class CacheManager {
  private static CACHE_NAME = 'flowy-engines-cache-v1';

  static async put(url: string, response: Response): Promise<void> {
    const cache = await caches.open(this.CACHE_NAME);
    await cache.put(url, response);
  }

  static async get(url: string): Promise<Response | undefined> {
    const cache = await caches.open(this.CACHE_NAME);
    return await cache.match(url);
  }

  static async delete(url: string): Promise<void> {
    const cache = await caches.open(this.CACHE_NAME);
    await cache.delete(url);
  }

  static async clear(): Promise<void> {
    await caches.delete(this.CACHE_NAME);
  }

  static async has(url: string): Promise<boolean> {
    const cache = await caches.open(this.CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
  }
}
