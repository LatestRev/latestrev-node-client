import { Pool, RetryAgent } from 'undici';

class ProjectClient {
    constructor({
        projectId,
        apiUrl = 'https://latestrev.com/api/v1/',
        apiKey,
        timeout = 20000 /* 20 secs */,
        retries = 3,
        maxSockets = 25,
    }) {
        if (!projectId) {
            throw new Error('Missing project id');
        }

        if (!apiKey) {
            throw new Error('Missing project API key');
        }

        this.apiKey = apiKey;

        // Parse origin and base path from the API URL
        const url = new URL('projects/' + projectId + '/', apiUrl);
        this._origin = url.origin;
        this._basePath = url.pathname;

        const pool = new Pool(this._origin, {
            headersTimeout: timeout,
            bodyTimeout: timeout,
            connections: maxSockets,
        });

        this._client = new RetryAgent(pool, { maxRetries: retries });
    }

    async _apiGetRequest(relativeUrl) {
        const path = this._basePath + relativeUrl + '?' + new URLSearchParams({ apiKey: this.apiKey });

        const { statusCode, body } = await this._client.request({
            method: 'GET',
            path,
        });

        if (statusCode < 200 || statusCode >= 300) {
            const text = await body.text();
            throw new Error(`API request failed: ${statusCode} ${path}\n${text}`);
        }

        return body.json();
    }

    async getPublishedReleaseVersion() {
        const releaseSummary = await this._apiGetRequest('releases/published/latest');
        return releaseSummary ? releaseSummary.version : null;
    }

    async getPublishedRelease(version) {
        return this._apiGetRequest(`releases/published/${version}/manifest`);
    }

    async getScheduledRelease(scheduledId) {
        return this._apiGetRequest(`releases/scheduled/${scheduledId}/manifest`);
    }

    async getSavedRelease() {
        return this._apiGetRequest('releases/saved/manifest');
    }

    async getItem(collectionId, itemId, itemVersion) {
        return this._apiGetRequest(
            `collections/${collectionId}/items/${itemId}/${itemVersion}`
        );
    }
}

export default ProjectClient;
