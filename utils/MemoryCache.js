var SingleOperation = require('./SingleOperation');

class MemoryCache {
    constructor({ defaultTTL = 5 * 60 * 1000, ttlByKey = {}, debug = false } = {}) {
        this.cache = {};
        this.singleOperation = new SingleOperation();

        // default time to live in ms
        this.ttlByKey = ttlByKey;
        this.defaultTTL = defaultTTL;

        // enable logging in debug mode
        this.debug = !!debug;
        //console.log('MemoryCache options: ' + JSON.stringify(options));
    }

    clear() {
        this.cache = {};
    }

    ensure(key, valueFactory, ttl, allowLazyRefresh) {
        var refreshValue = oldValue => {
            return this.singleOperation.run(key, () => {
                return valueFactory(oldValue).then(newValue => {
                    this.set(key, newValue, ttl);
                    return newValue;
                });
            });
        };

        var entry = key ? this.cache[key] : null;
        if (!entry) {
            return refreshValue();
        }

        if (Date.now() < entry.expires) {
            // not yet expired
            return Promise.resolve(entry.value);
        } else if (allowLazyRefresh) {
            // refresh in background, return expired result
            refreshValue(entry.value).catch(error => {
                // log but suppress any errors because they happen on a background thread
                console.error('Error refreshing cache value: ' + key);
                console.error(error);
            });
            return Promise.resolve(entry.value);
        } else {
            // refresh and wait
            return refreshValue(entry.value);
        }
    }

    ensureLazy(key, valueFactory, ttl) {
        return this.ensure(key, valueFactory, ttl, true);
    }

    get(key, allowExpired) {
        if (key) {
            var entry = this.cache[key];
            if (entry) {
                if (allowExpired || Date.now() < entry.expires) {
                    return entry.value;
                } else if (this.debug) {
                    console.log('expired cache entry: ' + key);
                }
            }
        }

        if (this.debug) {
            console.log('no cache entry: ' + key);
        }
        return undefined;
    }

    set(key, value, ttl) {
        // fallback to config then default ttl if not specified
        ttl = ttl || this.ttlByKey[key] || this.defaultTTL;

        var expires = Date.now() + ttl;
        this.cache[key] = new CacheEntry(value, expires);

        if (this.debug) {
            const ttlSeconds = Math.round(ttl / 1000);
            console.log('caching ' + key + ' (ttl:' + ttl + ' secs)');
        }
    }
}

class CacheEntry {
    constructor(value, expires) {
        this.value = value;
        this.expires = expires;
    }
}

module.exports = MemoryCache;
