const fsp = require('fs').promises;
const path = require('path');
const chunkArray = require('../utils/chunkArray');

// limit concurrency in parallel api calls
const PARALLEL_API_CALL_LIMIT = 25;

class ProjectFileSource {
    constructor(cachePath, fallbackSource) {
        this.cachePath = cachePath;
        this.source = fallbackSource;
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
        const manifestPath = path.join(this.cachePath, 'published', `${version}.json`);
        const json = await fsp.readFile(manifestPath).catch(err => null);
        if (json) {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error('error parsing manifest json at path: ' + manifestPath);
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

                // ensure published manifest path exists
                const publishedPath = path.join(this.cachePath, 'published');
                await fsp.mkdir(publishedPath, { recursive: true });

                // write manifest
                const manifestPath = path.join(publishedPath, manifest.version + '.json');
                await fsp.writeFile(manifestPath, JSON.stringify(manifest, 4, 4), 'utf8');
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
        const itemPath = path.join(
            this.cachePath,
            'collections',
            collectionId,
            `${itemId}-${itemVersion}.json`
        );

        // first check the file cache
        const json = await fsp.readFile(itemPath).catch(err => null);
        if (json) {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error('error parsing item json at path: ' + itemPath);
                console.error(error);
                // suppress error because we can refetch the file and save.
            }
        }

        // next fallback to source
        if (this.source) {
            const item = await this.source.getItem(collectionId, itemId, itemVersion);
            if (item) {
                // ensure collections folder exists
                const collectionPath = path.join(this.cachePath, 'collections', collectionId);
                await fsp.mkdir(collectionPath, { recursive: true });

                // cache item to file
                await fsp.writeFile(itemPath, JSON.stringify(item, 4, 4), 'utf8');
                return item;
            }
        }

        return null;
    }
}

module.exports = ProjectFileSource;
