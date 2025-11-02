
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
    // Construct the full path for server-side file system access
    const trailerDiskPath = path.join(process.cwd(), 'public', 'frames', validatedInput.movieId, 'trailer', validatedInput.frameFile);
    // Construct the web-accessible URL path for the client
    const trailerUrlPath = path.join('/frames', validatedInput.movieId, 'trailer', validatedInput.frameFile);

    try {
      // Check if the file actually exists at the physical location
      await access(trailerDiskPath);

      // If access() is successful, the file exists. Return the URL path.
      return NextResponse.json({ success: true, trailer: trailerUrlPath });
    } catch (err: any) {
        // If access() throws an error, check if it's because the file doesn't exist
        if (err.code === 'ENOENT') {
            // This is an expected case, not an error.
            return NextResponse.json({ success: true, trailer: '' });
        }

        // For any other errors (e.g., permissions), log it as a server error
        console.error(`Error accessing trailer file '${trailerDiskPath}':`, err);
        return NextResponse.json({ success: false, error: 'Server error while checking for trailer file.' }, { status: 500 });
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

    