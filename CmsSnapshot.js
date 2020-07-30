const axios = require('axios');
const MemoryCache = require('./utils/MemoryCache');

class CmsSnapshot {
    constructor(manifest, source) {
        // give each CMS an ID
        if (manifest.version) {
            this.id = 'published-' + manifest.version;
        } else {
            this.id = new Date().toISOString();
        }

        this.manifest = manifest;
        this.source = source;
        this._collectionsCache = {};

        // general purpose cache that can be used by clients that need to cache
        // computed results based on data fetched from the CMS
        this.cache = new MemoryCache();
    }

    getMediaUrl(mediaInfo) {
        if (
            mediaInfo &&
            typeof mediaInfo === 'object' &&
            mediaInfo.libraryId &&
            mediaInfo.fileId &&
            mediaInfo.extension &&
            this.manifest.media
        ) {
            const library = this.manifest.media[mediaInfo.libraryId];
            if (library && library.publicUrl) {
                return library.publicUrl + mediaInfo.fileId + '.' + mediaInfo.extension;
            }
        }
        return null;
    }

    async getItem(collectionId, itemId) {
        const collectionItemVersions = this.manifest.collections[collectionId];
        if (collectionItemVersions) {
            const itemVersion = collectionItemVersions[itemId];
            if (itemVersion) {
                return this.source.getItem(collectionId, itemId, itemVersion);
            }
        }

        return null;
    }

    async getItems(collectionId) {
        // see if we have the cached item
        const cachedItems = this._collectionsCache[collectionId];
        if (cachedItems) {
            return cachedItems;
        }

        const items = [];
        const collectionItems = this.manifest.collections[collectionId];
        if (collectionItems) {
            for (const itemId of Object.keys(collectionItems)) {
                const item = await this.getItem(collectionId, itemId);
                if (item) {
                    items.push(item);
                }
            }
            this._collectionsCache[collectionId] = items;
        }

        return items;
    }
}

module.exports = CmsSnapshot;
