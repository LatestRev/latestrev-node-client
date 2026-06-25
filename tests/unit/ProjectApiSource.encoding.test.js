import { describe, it, expect } from 'vitest';
import ProjectApiSource from '../../src/sources/ProjectApiSource.js';

// Build a client whose transport just records the request path, so we can assert
// how ids/versions are encoded without hitting the network.
function clientCapturingPath() {
    const client = new ProjectApiSource({
        projectId: 'proj1',
        apiKey: 'test-key',
        apiUrl: 'https://example.com/api/v1/',
    });
    const paths = [];
    client._client = {
        request: async ({ path }) => {
            paths.push(path);
            return { statusCode: 200, body: { json: async () => ({}) } };
        },
    };
    return { client, paths };
}

describe('ProjectApiSource path encoding', () => {
    it('encodes spaces in collection/item/version segments', async () => {
        const { client, paths } = clientCapturingPath();
        await client.getItem('edge-pages', 'home page', 'v 1');
        expect(paths[0]).toContain('/collections/edge-pages/items/home%20page/v%201');
        // A raw space would make undici throw "invalid request path".
        expect(paths[0]).not.toContain(' ');
    });

    it('encodes a release version', async () => {
        const { client, paths } = clientCapturingPath();
        await client.getPublishedRelease('draft 2');
        expect(paths[0]).toContain('releases/published/draft%202/manifest');
    });

    it('neutralizes path traversal in ids', async () => {
        const { client, paths } = clientCapturingPath();
        await client.getItem('col', '../../secret', '1');
        expect(paths[0]).toContain('/items/..%2F..%2Fsecret/');
        expect(paths[0]).not.toContain('/../');
    });
});
