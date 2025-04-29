
import { access } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const TrailerFileApiInputSchema = z.object({
  movieId: z.string().regex(/^tt\d+$/, 'Invalid IMDb ID format.'),
  frameFile: z.string().regex(/^.+\.(png|jpe?g|webp)$/i, 'Invalid frame filename format.'), // Basic validation for image file
});

const TrailerFileApiOutputSchema = z.object({
  success: z.boolean(),
  trailer: z.string().optional(), // The filename of the corresponding trailer image if found
  error: z.string().optional(),
});

export type TrailerFileApiOutput = z.infer<typeof TrailerFileApiOutputSchema>;

/**
 * API Route to check if a corresponding trailer image exists for a given frame file.
 * Expects query parameters: `movieId` and `frameFile`.
 * Returns the trailer filename if found, or an empty string if not.
 */
export async function GET(req: NextRequest): Promise<NextResponse<TrailerFileApiOutput>> {
  try {
    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get('movieId');
    const frameFile = searchParams.get('frameFile');

    if (!movieId || !frameFile) {
      return NextResponse.json(
        { success: false, error: 'Missing movieId or frameFile parameters.' },
        { status: 400 }
      );
    }

    // Validate input using Zod
    const validatedInput = TrailerFileApiInputSchema.parse({ movieId, frameFile });

    // Construct paths
    const trailersBasePath = path.join('/frames');
    const trailerFolderPath = path.join(trailersBasePath, validatedInput.movieId, 'trailer');

    // Extract filename without extension from frameFile and append the expected trailer extension (assuming .png for now)
    const frameFileNameWithoutExt = path.parse(validatedInput.frameFile).name;
    const trailerFileName = `${frameFileNameWithoutExt}.png`; // Assuming trailer files are PNGs
    const trailerFilePath = path.join(trailerFolderPath, trailerFileName);

    try {
      // If access is successful, the file exists
      return NextResponse.json({ success: true, trailer: trailerFilePath });
    } catch (err: any) {
      // If access fails with ENOENT, the file doesn't exist
      if (err.code === 'ENOENT') {
        return NextResponse.json({ success: true, trailer: '' }); // Indicate success but no file found
      }
      // Log other potential file system errors
      console.error(`Error checking for trailer file '${trailerFilePath}' for movie ID ${validatedInput.movieId}:`, err);
      return NextResponse.json({ success: false, error: 'Failed to check trailer file existence.' }, { status: 500 });
    }
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      console.error('Validation error checking trailer file:', error.errors);
      return NextResponse.json({ success: false, error: 'Invalid input format.' }, { status: 400 });
    }
    // Handle unexpected errors
    console.error('Unexpected error checking trailer file:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

    