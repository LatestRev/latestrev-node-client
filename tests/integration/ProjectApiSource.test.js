import { describe, it, expect, beforeAll } from 'vitest';
import ProjectApiSource from '../../src/sources/ProjectApiSource.js';

const projectId = process.env.TEST_PROJECT_ID;
const apiKey = process.env.TEST_API_KEY;
const apiUrl = process.env.TEST_API_URL;

describe('ProjectApiSource', () => {
    let client;

    beforeAll(() => {
        if (!projectId || !apiKey) {
            throw new Error('TEST_PROJECT_ID and TEST_API_KEY must be set in .env');
        }
        client = new ProjectApiSource({ projectId, apiKey, apiUrl });
    });

    describe('constructor', () => {
        it('should throw if projectId is missing', () => {
            expect(() => new ProjectApiSource({ apiKey: 'test' })).toThrow('Missing project id');
        });

        it('should throw if apiKey is missing', () => {
            expect(() => new ProjectApiSource({ projectId: 'test' })).toThrow(
                'Missing project API key'
            );
        });
    });

    describe('getPublishedReleaseVersion', () => {
        it('should return a version number', async () => {
            const version = await client.getPublishedReleaseVersion();
            expect(version).toBeDefined();
            expect(typeof version).toBe('number');
        });
    });

    describe('getPublishedRelease', () => {
        it('should return a manifest with collections and media', async () => {
            const version = await client.getPublishedReleaseVersion();
            const manifest = await client.getPublishedRelease(version);

            expect(manifest).toBeDefined();
            expect(manifest).toHaveProperty('collections');
            expect(manifest).toHaveProperty('media');
            expect(typeof manifest.collections).toBe('object');
        });
    });

    describe('getItem', () => {
        it('should return item data for a valid item', async () => {
            const version = await client.getPublishedReleaseVersion();
            const manifest = await client.getPublishedRelease(version);

            // find the first collection with at least one item
            const collectionId = Object.keys(manifest.collections).find(
                id => Object.keys(manifest.collections[id]).length > 0
            );

            if (collectionId) {
                const items = manifest.collections[collectionId];
                const [itemId, itemVersion] = Object.entries(items)[0];
                const item = await client.getItem(collectionId, itemId, itemVersion);

                expect(item).toBeDefined();
                expect(typeof item).toBe('object');
            }
        });
    });

    describe('error handling', () => {
        it('should throw on invalid project ID', async () => {
            const badClient = new ProjectApiSource({
                projectId: 'nonexistent',
                apiKey,
                apiUrl,
            });

            await expect(badClient.getPublishedReleaseVersion()).rejects.toThrow();
        });
    });
});
