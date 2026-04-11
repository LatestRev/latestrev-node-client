import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCmsFactory } from '../../src/index.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const projectId = process.env.TEST_PROJECT_ID;
const apiKey = process.env.TEST_API_KEY;
const apiUrl = process.env.TEST_API_URL;

describe('CmsSnapshot', () => {
    let snapshot;
    let cachePath;

    beforeAll(async () => {
        if (!projectId || !apiKey) {
            throw new Error('TEST_PROJECT_ID and TEST_API_KEY must be set in .env');
        }
        cachePath = await mkdtemp(path.join(tmpdir(), 'latestrev-test-'));
        const factory = createCmsFactory({ projectId, apiKey, apiUrl, cachePath });
        snapshot = await factory.getPublished();
    });

    afterAll(async () => {
        if (cachePath) {
            await rm(cachePath, { recursive: true, force: true });
        }
    });

    describe('getMediaUrl', () => {
        it('should return null for null input', () => {
            expect(snapshot.getMediaUrl(null)).toBeNull();
        });

        it('should return null for invalid media info', () => {
            expect(snapshot.getMediaUrl({ libraryId: 'bad' })).toBeNull();
        });

        it('should return a URL for valid media info with a known library', () => {
            const libraries = snapshot.manifest.media || {};
            const libraryId = Object.keys(libraries).find(id => libraries[id].publicUrl);

            if (libraryId) {
                const url = snapshot.getMediaUrl({
                    libraryId,
                    fileId: 'test-file',
                    extension: 'png',
                });
                expect(url).toBeDefined();
                expect(url).toContain('test-file.png');
                expect(url).toMatch(/^https?:\/\//);
            }
        });
    });

    describe('getMediaDetails', () => {
        it('should return null for null input', () => {
            expect(snapshot.getMediaDetails(null)).toBeNull();
        });

        it('should return details object with expected properties', () => {
            const libraries = snapshot.manifest.media || {};
            const libraryId = Object.keys(libraries).find(id => libraries[id].publicUrl);

            if (libraryId) {
                const details = snapshot.getMediaDetails({
                    libraryId,
                    fileId: 'test-file',
                    extension: 'jpg',
                    width: 800,
                    height: 600,
                });

                expect(details).toBeDefined();
                expect(details.fileId).toBe('test-file');
                expect(details.extension).toBe('jpg');
                expect(details.width).toBe(800);
                expect(details.height).toBe(600);
                expect(details.publicUrl).toContain('test-file.jpg');
            }
        });
    });

    describe('getLocalizedString', () => {
        it('should fall back to itemId when entry does not exist', async () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            if (collectionIds.length > 0) {
                const result = await snapshot.getLocalizedString(
                    collectionIds[0],
                    'nonexistent-item',
                    'en'
                );
                expect(result).toBe('nonexistent-item');
            }
        });

        it('should return null when fallbackToId is false and entry does not exist', async () => {
            const collectionIds = Object.keys(snapshot.manifest.collections);
            if (collectionIds.length > 0) {
                const result = await snapshot.getLocalizedString(
                    collectionIds[0],
                    'nonexistent-item',
                    'en',
                    true,
                    false
                );
                expect(result).toBeNull();
            }
        });
    });

    describe('getLocalizedLookup', () => {
        it('should return text from a non-localized lookup entry', async () => {
            const result = await snapshot.getLocalizedLookup('en', {
                text: 'Hello World',
            });
            expect(result).toBe('Hello World');
        });

        it('should return undefined for null lookup entry', async () => {
            const result = await snapshot.getLocalizedLookup('en', null);
            expect(result).toBeUndefined();
        });
    });
});
