const { MemoryCache } = require('@thinkpixellab-public/px-long-operations');

class ProjectMemorySource {
    constructor(fallbackSource) {
        this.source = fallbackSource;

        this._publishedReleaseVersion = null;
        this._itemCache = new MemoryCache({ defaultTTL: Number.MAX_SAFE_INTEGER });
        this._manifestCache = new MemoryCache({ defaultTTL: Number.MAX_SAFE_INTEGER });
    }

    async getPublishedReleaseVersion(ignoreCache) {
        if (this.source && (ignoreCache || !this._publishedReleaseVersion)) {
            var version = this.source.getPublishedReleaseVersion(ignoreCache);
            if (version) {
                this._publishedReleaseVersion = version;
            }
        }

        return this._publishedReleaseVersion;
    }

    async getPublishedRelease(version) {
        const cacheKey = version.toString();
        const manifest = await this._manifestCache.ensure(cacheKey, () => {
            return this.source ? this.source.getPublishedRelease(version) : null;
        });
        // return a copy to make sure callers don't modify cached item
        return structuredClone(manifest);
    }

    async getScheduledRelease(scheduledId) {
        // scheduled releases are mutable so just pass request to fallback source
        return this.source ? this.source.getScheduledRelease(scheduledId) : null;
    }

    async getSavedRelease() {
        // current saved items are mutable so just pass request to fallback source
        return this.source ? this.source.getSavedRelease() : null;
    }

    async getItem(collectionId, itemId, itemVersion) {
        const cacheKey = `${collectionId}-${itemId}-${itemVersion}`;
        const item = await this._itemCache.ensure(cacheKey, () => {
            if (this.source) {
                return this.source.getItem(collectionId, itemId, itemVersion);
            }
            return null;
        });

        // return a copy to make sure callers don't modify cached item
        return structuredClone(item);
    }
}

module.exports = ProjectMemorySource;
