const { MemoryCache } = require('@thinkpixellab-public/px-long-operations');
const chunkArray = require('./utils/chunkArray');

// limit concurrency in parallel api calls
const PARALLEL_API_CALL_LIMIT = 25;

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

        // general purpose cache that can be used by clients that need to cache
        // computed results based on data fetched from the CMS
        this.cache = new MemoryCache({ defaultTTL: Number.MAX_SAFE_INTEGER });
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

    getMediaDetails(mediaInfo) {
        if (
            mediaInfo &&
            typeof mediaInfo === 'object' &&
            mediaInfo.libraryId &&
            mediaInfo.fileId &&
            mediaInfo.extension
        ) {
            const library = (this.manifest.media || {})[mediaInfo.libraryId];
            const libraryPublicUrl = library?.publicUrl;

            let publicUrl = (libraryPublicUrl || '') + mediaInfo.fileId + '.' + mediaInfo.extension;

            const details = {
                libraryPublicUrl,
                libraryId: mediaInfo.libraryId,
                extension: mediaInfo.extension,
                fileId: mediaInfo.fileId,
                publicUrl,
            };

            // add height and width (not always available)
            if (mediaInfo.width && mediaInfo.height) {
                details.width = mediaInfo.width;
                details.height = mediaInfo.height;
            }

            return details;
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
        let items = [];
        const collectionItems = this.manifest.collections[collectionId];
        if (collectionItems) {
            // fetch items in parallel
            const itemIds = Object.keys(collectionItems);

            let fetchedItems = [];
            for (const idChunks of chunkArray(itemIds, PARALLEL_API_CALL_LIMIT)) {
                const chunkItems = await Promise.all(
                    idChunks.map(itemId => this.getItem(collectionId, itemId))
                );
                fetchedItems = fetchedItems.concat(chunkItems);
            }

            // remove any empty items
            items = fetchedItems.filter(item => !!item);
        }

        return items;
    }

    async getLocalizedString(
        collectionId,
        itemId,
        locale,
        fallbackToSource = true,
        fallbackToId = true
    ) {
        let result = null;

        const entry = await this.getItem(collectionId, itemId);
        if (entry) {
            const localeEntry = entry[locale];
            if (localeEntry?.selected) {
                result = localeEntry[localeEntry.selected];
            }

            if (fallbackToSource && (result === null || result === undefined)) {
                result = entry.source;
            }
        }

        // fallback to loc-id if no entry was found
        if (fallbackToId && (result === null || result === undefined)) {
            return itemId;
        }

        return result;
    }

    async getLocalizedLookup(locale, lookupEntry) {
        // if a collectionId and itemId are found, lookup localized string
        if (lookupEntry?.collectionId && lookupEntry?.itemId) {
            return this.getLocalizedString(lookupEntry.collectionId, lookupEntry.itemId, locale);
        }

        // otherwise use non-localized text if set
        return lookupEntry?.text;
    }
}

module.exports = CmsSnapshot;
