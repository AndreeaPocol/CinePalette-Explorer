
'use server';

import { z } from 'zod';
import { getFullFrameList } from '../data/frame-cache';


// Define the input schema for validation
const InputSchema = z.object({
  movieId: z.string().regex(/^tt\d+$/, 'Invalid IMDb ID format.'), // Basic validation for IMDb ID format
});


export type FrameData = {
  fileName: string;
}

export type GetColorFrameFoldersPaginationOutput = {
  frames: FrameData[];
  hasMore: boolean; // Indicates if more frames are available to fetch
  error?: string; // Optional error message
}

/**
 * Fetches frames for a specific color and movie, supporting pagination.
 *
 * @param input - An object containing movieId, colorHex, page, and pageSize.
 * @returns An object containing the frames array, a boolean indicating if more pages exist, and an optional error.
 */
export async function getColorFrameFoldersPaginated(input: {
  movieId: string;
  color: string;
  page: number;
  pageSize: number;
}): Promise<GetColorFrameFoldersPaginationOutput> {
  const { movieId, color, page, pageSize } = input;
  console.log(`Fetching frames for ${movieId}, color ${color} (Page ${page}, Size ${pageSize})`);

  try {
    // Validate input
    const validatedInput = InputSchema.parse(input);
    const { movieId } = validatedInput;

    const frameFiles = await getFullFrameList(movieId, color); // Instant lookup

    // Apply pagination logic
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedFramePaths = frameFiles.slice(start, end);

    // 4. Check if there are more frames available after this page
    const hasMore = end < frameFiles.length;

    // 5. Transform paths into FrameData objects (MOCKING the color data)
    const frames: FrameData[] = paginatedFramePaths.map(fileName => ({
      fileName: fileName,
    }));

    return { frames, hasMore};
  } catch (error) {
    console.error('Server action failed:', error);
    return {
      frames: [],
      hasMore: false,
      error: 'Failed to load frame data due to a server error.',
    };
  }
}