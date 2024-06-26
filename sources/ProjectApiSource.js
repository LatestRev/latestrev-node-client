const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const KeepAliveAgent = require('agentkeepalive');
const KeepAliveHttpsAgent = require('agentkeepalive').HttpsAgent;

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
        this.projectId = projectId;
        this.apiClient = axios.create({
            baseURL: apiUrl + 'projects/' + this.projectId + '/',
            timeout: timeout,
            httpAgent: new KeepAliveAgent({ maxSockets }),
            httpsAgent: new KeepAliveHttpsAgent({ maxSockets }),
        });
        axiosRetry(axios, { retries: retries, retryDelay: axiosRetry.exponentialDelay });
    }

    async _apiGetRequest(url) {
        //console.log(`RevAPI: ` + url);
        return this.apiClient.get(url, {
            params: {
                apiKey: this.apiKey,
            },
        });
    }

    async getPublishedReleaseVersion() {
        const response = await this._apiGetRequest(`releases/published/latest`);
        const releaseSummary = response.data;
        return releaseSummary ? releaseSummary.version : null;
    }

    async getPublishedRelease(version) {
        const response = await this._apiGetRequest(`releases/published/${version}/manifest`);
        return response.data;
    }

    async getScheduledRelease(scheduledId) {
        const response = await this._apiGetRequest(`releases/scheduled/${scheduledId}/manifest`);
        return response.data;
    }

    async getSavedRelease() {
        const response = await this._apiGetRequest(`releases/saved/manifest`);
        return response.data;
    }

    async getItem(collectionId, itemId, itemVersion) {
        const response = await this._apiGetRequest(
            `collections/${collectionId}/items/${itemId}/${itemVersion}`
        );
        return response.data;
    }
}

module.exports = ProjectClient;
