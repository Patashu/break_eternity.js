/**
 * A LRU cache intended for caching pure functions.
 */
export declare class LRUCache<K, V> {
    private map;
    private first;
    private last;
    maxSize: number;
    /**
     * @param maxSize The maximum size for this cache. We recommend setting this
     * to be one less than a power of 2, as most hashtables - including V8's
     * Object hashtable (https://crsrc.org/c/v8/src/objects/ordered-hash-table.cc)
     * - uses powers of two for hashtable sizes. It can't exactly be a power of
     * two, as a .set() call could temporarily set the size of the map to be
     * maxSize + 1.
     */
    constructor(maxSize: number);
    get size(): number;
    /**
     * Gets the specified key from the cache, or undefined if it is not in the
     * cache.
     * @param key The key to get.
     * @returns The cached value, or undefined if key is not in the cache.
     */
    get(key: K): V | undefined;
    /**
     * Sets an entry in the cache.
     *
     * @param key The key of the entry.
     * @param value The value of the entry.
     * @throws Error, if the map already contains the key.
     */
    set(key: K, value: V): void;
}
