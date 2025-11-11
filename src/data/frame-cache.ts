import * as fs from 'fs/promises'; // Use the promise API for non-blocking I/O
import * as path from 'path';

// Define the shape of the cache:
// Key: `${movieId}:${color}` (e.g., "avatar:blue")
// Value: string[] (A sorted list of frame filenames, e.g., ["0001.png", "0002.png"])
const frameCache: Map<string, string[]> = new Map();

// Define the static root path for your frame directories
const FRAMES_ROOT_DIR = path.join(process.cwd(), 'public', 'frames');

/**
 * Generates a unique key for the cache map.
 * @param movieId - The movie identifier.
 * @param color - The color folder name (e.g., "blue").
 */
const getCacheKey = (movieId: string, color: string): string => {
    return `${movieId}:${color}`;
};

/**
 * Retrieves the full, sorted list of frame filenames for a given movie/color combination.
 * This function will read from disk only if the entry is not already in the cache.
 * @param movieId - The movie identifier.
 * @param color - The color folder name (e.g., "blue").
 * @returns A promise that resolves to the full sorted list of frame file names.
 */
export async function getFullFrameList(movieId: string, color: string): Promise<string[]> {
    const key = getCacheKey(movieId, color);
    
    // 1. Check the cache first (instantaneous)
    if (frameCache.has(key)) {
        return frameCache.get(key)!;
    }

    // 2. If not found, read from disk (SLOW, only happens once per key)
    const framesDirPath = path.join(FRAMES_ROOT_DIR, movieId, color);

    try {
        const dirEntries = await fs.readdir(framesDirPath, { withFileTypes: true });

        const frameFiles = dirEntries
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        // 3. Store the result in the cache before returning
        frameCache.set(key, frameFiles);
        console.log(`[Cache Miss] Loaded ${frameFiles.length} frames for ${movieId}/${color} into memory.`);
        
        return frameFiles;

    } catch (error) {
        // If the directory doesn't exist, log and cache an empty array
        console.warn(`Frame directory not found for ${movieId}/${color}. Path: ${framesDirPath}`);
        frameCache.set(key, []);
        return [];
    }
}