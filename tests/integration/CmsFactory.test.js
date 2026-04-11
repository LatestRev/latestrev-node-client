import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCmsFactory } from '../../src/index.js';
import CmsSnapshot from '../../src/CmsSnapshot.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const projectId = process.env.TEST_PROJECT_ID;
const apiKey = process.env.TEST_API_KEY;
const apiUrl = process.env.TEST_API_URL;

describe('CmsFactory', () => {
    let factory;
    let cachePath;

    beforeAll(async () => {
        if (!projectId || !apiKey) {
            throw new Error('TEST_PROJECT_ID and TEST_API_KEY must be set in .env');
        }
        cachePath = await mkdtemp(path.join(tmpdir(), 'latestrev-test-'));
        factory = createCmsFactory({ projectId, apiKey, apiUrl, cachePath });
    });

    afterAll(async () => {
        if (cachePath) {
            await rm(cachePath, { recursive: true, force: true });
        }
    });

    describe('getPublished', () => {
        it('should return a CmsSnapshot', async () => {
            const snapshot = await factory.getPublished();

            expect(snapshot).toBeInstanceOf(CmsSnapshot);
            expect(snapshot.manifest).toBeDefined();
            expect(snapshot.manifest).toHaveProperty('collections');
            expect(snapshot.id).toBeDefined();
            expect(snapshot.id).toMatch(/^published-/);
        });
    });

    describe('refreshPublished', () => {
        it('should fetch and return a CmsSnapshot', async () => {
            const snapshot = await factory.refreshPublished();

            expect(snapshot).toBeInstanceOf(CmsSnapshot);
            expect(snapshot.manifest).toHaveProperty('collections');
        });

        it('should return the same instance when version has not changed', async () => {
            const first = await factory.refreshPublished();
            const second = await factory.refreshPublished();

            expect(first).toBe(second);
        });
    });

    describe('snapshot data access', () => {
        let snapshot;

        beforeAll(async () => {
            snapshot = await factory.getPublished();
        });

        it('should list collections in the manifest', () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            expect(collectionIds.length).toBeGreaterThan(0);
        });

        it('should fetch items from a collection', async () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            const collectionId = collectionIds[0];
            const items = await snapshot.getItems(collectionId);

            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);
        });

        it('should fetch a single item', async () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            const collectionId = collectionIds[0];
            const itemIds = Object.keys(snapshot.manifest.collections[collectionId]);
            const itemId = itemIds[0];
            const item = await snapshot.getItem(collectionId, itemId);

            expect(item).toBeDefined();
            expect(typeof item).toBe('object');
        });

        it('should return null for a non-existent item', async () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            const item = await snapshot.getItem(collectionIds[0], 'nonexistent-item-id');

            expect(item).toBeNull();
        });

        it('should return null for a non-existent collection', async () => {
            const item = await snapshot.getItem('nonexistent-collection', 'nonexistent-item');

            expect(item).toBeNull();
        });
    });
});
