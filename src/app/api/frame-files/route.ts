import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const FrameFilesApiInputSchema = z.object({
  movieId: z.string().regex(/^tt\d+$/, 'Invalid IMDb ID format.'),
  color: z.string(),
});

const FrameFilesApiOutputSchema = z.object({
  success: z.boolean(),
  files: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type FrameFilesApiOutput = z.infer<typeof FrameFilesApiOutputSchema>;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get('movieId');
    const color = searchParams.get('color');

    if (!movieId || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing movieId or color parameters.' },
        { status: 400 }
      );
    }

    const validatedInput = FrameFilesApiInputSchema.parse({ movieId, color });

    const framesBasePath = path.join(process.cwd(), 'public', 'frames');
    const colorFolderPath = path.join(framesBasePath, validatedInput.movieId, validatedInput.color);

    try {
      const files = await readdir(colorFolderPath);
      return NextResponse.json({ success: true, files });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.warn(`Color folder not found for movie ID ${validatedInput.movieId} and color ${validatedInput.color}: ${colorFolderPath}`);
        return NextResponse.json({ success: true, files: [] });
      }
      console.error(`Error reading color folder for movie ID ${validatedInput.movieId} and color ${validatedInput.color}:`, err);
      return NextResponse.json({ success: false, error: 'Failed to read frame data.' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Validation error fetching frame files:', error.errors);
      return NextResponse.json({ success: false, error: 'Invalid input format.' }, { status: 400 });
    }
    console.error('Unexpected error fetching frame files:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}