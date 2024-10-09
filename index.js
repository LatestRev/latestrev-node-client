const ProjectApiSource = require('./sources/ProjectApiSource');
const ProjectFileSource = require('./sources/ProjectFileSource');
const ProjectMemorySource = require('./sources/ProjectMemorySource');
const CmsFactory = require('./CmsFactory');

module.exports = {
    // sources
    ProjectApiSource,
    ProjectFileSource,
    ProjectMemorySource,

    ProjectSnapshot: require('./CmsSnapshot'),

    Express: require('./express'),

    createCmsFactory: function ({
        projectId,
        apiUrl,
        apiKey,
        cachePath,
        writeCacheFile,
        publishedTTLSeconds,
    }) {
        const apiSource = new ProjectApiSource({
            projectId: projectId,
            apiUrl: apiUrl,
            apiKey: apiKey,
        });

        const fileSource = new ProjectFileSource({
            cachePath,
            fallbackSource: apiSource,
            writeCacheFile,
        });
        const memorySource = new ProjectMemorySource(fileSource);
        return new CmsFactory(memorySource, publishedTTLSeconds);
    },
};
