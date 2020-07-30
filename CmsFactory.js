const axios = require('axios');
const MemoryCache = require('./utils/MemoryCache');
const CmsSnapshot = require('./CmsSnapshot');

class CmsFactory {
    constructor(source, publishedTTLSeconds) {
        this.source = source;

        publishedTTLSeconds = publishedTTLSeconds || 15 * 60; // default to 15 minutes
        this._cache = new MemoryCache({ defaultTTL: publishedTTLSeconds * 1000 });
    }

    async refreshPublished() {
        const existingPublished = this._cache.get('published', true /* allow expired */);

        // fetch the latest version, ignoring cache
        var publishedVersion = await this.source.getPublishedReleaseVersion(
            true /* ignore cache */
        );

        // if version hasn't changed, we are fine to continue using existing CMS instance
        if (
            existingPublished &&
            (existingPublished.manifest.version === publishedVersion || !publishedVersion)
        ) {
            return existingPublished;
        }

        let manifest;
        if (!publishedVersion) {
            // handle new projects where nothing has been published
            manifest = { collections: {}, media: {} };
        } else {
            manifest = await this.source.getPublishedRelease(publishedVersion);
        }

        const snapshot = new CmsSnapshot(manifest, this.source);
        this._cache.set('published', snapshot);
        return snapshot;
    }

    async getPublished() {
        return this._cache.ensureLazy('published', () => this.refreshPublished());
    }

    async getScheduled(scheduledId) {
        var manifest = await this.source.getScheduledRelease(scheduledId);
        return new CmsSnapshot(manifest, this.source);
    }

    async getSaved() {
        var manifest = await this.source.getSavedRelease();
        return new CmsSnapshot(manifest, this.source);
    }
}

module.exports = CmsFactory;
