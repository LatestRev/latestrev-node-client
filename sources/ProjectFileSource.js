const fsp = require('fs').promises;
const path = require('path');
const chunkArray = require('../utils/chunkArray');

// limit concurrency in parallel api calls
const PARALLEL_API_CALL_LIMIT = 25;

class ProjectFileSource {
    constructor({ cachePath, fallbackSource, writeCacheFile }) {
        this.cachePath = cachePath;
        this.source = fallbackSource;

        this.writeCacheFile = writeCacheFile || this.defaultWriteCacheFile;
    }

    async defaultWriteCacheFile(cacheRelativePath, data) {
        // ensure the containing folder exists
        const fullPath = path.join(this.cachePath, cacheRelativePath);
        const folderPath = path.parse(fullPath).dir;
        await fsp.mkdir(folderPath, { recursive: true });

        // write the file to disk
        await fsp.writeFile(fullPath, JSON.stringify(data, 4, 4), 'utf8');
    }

    async getPublishedReleaseVersion(ignoreCache) {
        if (ignoreCache && this.source) {
            var publishedVersion = await this.source
                .getPublishedReleaseVersion(ignoreCache)
                .catch(err => {
                    // log error but ignore and fall back to file catch
                    console.error(err);
                    return null;
                });
            if (publishedVersion) {
                return publishedVersion;
            }
        }

        const publishedPath = path.join(this.cachePath, 'published');
        const allFiles = await fsp.readdir(publishedPath).catch(err => []);
        const manifestFiles = allFiles.filter(file => path.extname(file).toLowerCase() === '.json');
        const manifestVersions = manifestFiles.map(filename =>
            parseInt(filename.replace('.json', ''), 10)
        );

        manifestVersions.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

        return manifestVersions.length > 0 ? manifestVersions.pop() : null;
    }

    async getPublishedRelease(version) {
        const cacheRelativePath = path.join('published', `${version}.json`);
        const manifestPath = path.join(this.cachePath, cacheRelativePath);
        const json = await fsp.readFile(manifestPath).catch(err => null);
        if (json) {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error('error parsing manifest json at path: ' + cacheRelativePath);
                console.error(error);
                // suppress error because we can refetch the file and save.
            }
        }

        // next fallback to source
        if (this.source) {
            const manifest = await this.source.getPublishedRelease(version);
            if (manifest) {
                // pre-cache each collection in the manifest
                // NOTE: we don't do collections in parallel to avoid too many concurrent requests
                for (const [collectionId, itemVersions] of Object.entries(manifest.collections)) {
                    for (const idVersionPairs of chunkArray(
                        Object.entries(itemVersions),
                        PARALLEL_API_CALL_LIMIT
                    )) {
                        // get cached versions for set of items in parallel
                        await Promise.all(
                            idVersionPairs.map(([itemId, itemVersion]) =>
                                this.getItem(collectionId, itemId, itemVersion)
                            )
                        );
                    }
                }

                await this.writeCacheFile(cacheRelativePath, manifest);
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
        const cacheRelativePath = path.join(
            'collections',
            collectionId,
            `${itemId}-${itemVersion}.json`
        );

        const fullItemPath = path.join(this.cachePath, cacheRelativePath);

        // first check the file cache
        const json = await fsp.readFile(fullItemPath).catch(err => null);
        if (json) {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error('error parsing item json at path: ' + cacheRelativePath);
                console.error(error);
                // suppress error because we can refetch the file and save.
            }
        }

        // next fallback to source
        if (this.source) {
            const item = await this.source.getItem(collectionId, itemId, itemVersion);
            if (item) {
                // cache item to file
                await this.writeCacheFile(cacheRelativePath, item);
                return item;
            }
        }

        return null;
    }
}

module.exports = ProjectFileSource;
