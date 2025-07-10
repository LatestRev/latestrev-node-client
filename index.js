import ProjectApiSource from './sources/ProjectApiSource.js';
import ProjectFileSource from './sources/ProjectFileSource.js';
import ProjectMemorySource from './sources/ProjectMemorySource.js';
import CmsFactory from './CmsFactory.js';

import ProjectSnapshot from './CmsSnapshot.js';
import Express from './express.js';

export {
    // sources
    ProjectApiSource,
    ProjectFileSource,
    ProjectMemorySource,
    ProjectSnapshot,
    Express,
};

export function createCmsFactory({
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
    }
