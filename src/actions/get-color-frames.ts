
'use server';

import { readdir } from 'fs/promises';
import path from 'path';
import { ZodError, z } from 'zod';

// Define the input schema for validation
const InputSchema = z.object({
  movieId: z.string().regex(/^tt\d+$/, 'Invalid IMDb ID format.'), // Basic validation for IMDb ID format
});

// Define the output schema
const OutputSchema = z.object({
  success: z.boolean(),
  data: z.array(z.string()).optional(), // Array of color hex strings (folder names)
  error: z.string().optional(),
});

export type GetColorFrameFoldersOutput = z.infer<typeof OutputSchema>;

/**
 * Fetches the names of subdirectories within the public/frames/{movieId} directory
 * that match a hex color format (#RRGGBB).
 *
 * @param input - An object containing the movieId.
 * @returns An object with success status, data (array of color folder names), or an error message.
 */
export async function getColorFrameFolders(input: {
  movieId: string;
}): Promise<GetColorFrameFoldersOutput> {
  try {
    // Validate input
    const validatedInput = InputSchema.parse(input);
    const { movieId } = validatedInput;

    // Construct the full path to the movie's frame directory within /public
    // process.cwd() points to the root of the Next.js project
    const framesBasePath = path.join(process.cwd(), 'public', 'frames');
    const movieFramesPath = path.join(framesBasePath, movieId);

    try {
      const dirEntries = await readdir(movieFramesPath, { withFileTypes: true });
      const colorFolders = dirEntries.filter((entry) => entry.isDirectory()
        )
        .map((entry) => entry.name); // Extract folder names

      return { success: true, data: colorFolders };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Directory not found is not necessarily a server error, but indicates no frames
        console.warn(`Frame directory not found for movie ID ${movieId}: ${movieFramesPath}`);
        return { success: true, data: [] }; // Return success with empty data
      }
      // Log other file system errors
      console.error(`Error reading frame directory for movie ID ${movieId}:`, err);
      return { success: false, error: 'Failed to read frame data.' };
    }
  } catch (error) {
     if (error instanceof ZodError) {
        console.error('Validation error fetching color frames:', error.errors);
        return { success: false, error: 'Invalid input format.' };
    }
    console.error('Unexpected error fetching color frames:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
