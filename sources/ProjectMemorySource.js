const axios = require('axios');
const fsp = require('fs').promises;
const path = require('path');

class ProjectMemorySource {
    constructor(fallbackSource) {
        this.source = fallbackSource;

        this._publishedReleaseVersion = null;
        this._itemCache = {};
        this._manifestCache = {};
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
        const cachedManifest = this._manifestCache[cacheKey];
        if (cachedManifest) {
            return cachedManifest;
        }

        if (this.source) {
            const manifest = await this.source.getPublishedRelease(version);
            if (manifest) {
                this._manifestCache[cacheKey] = manifest;
                return manifest;
            }
        }

        return null;
    }

    async getScheduledRelease(scheduledId) {
        return this.source ? this.source.getScheduledRelease(scheduledId) : null;
    }

    async getSavedRelease() {
        return this.source ? this.source.getSavedRelease() : null;
    }

    async getItem(collectionId, itemId, itemVersion) {
        const cacheKey = `${collectionId}-${itemId}-${itemVersion}`;
        const cachedItem = this._itemCache[cacheKey];
        if (cachedItem) {
            return cachedItem;
        }

        if (this.source) {
            const item = await this.source.getItem(collectionId, itemId, itemVersion);
            if (item) {
                this._itemCache[cacheKey] = item;
                return item;
            }
        }

        return null;
    }
}

module.exports = ProjectMemorySource;
