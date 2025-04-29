import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const FrameCountApiInputSchema = z.object({
  movieId: z.string().regex(/^tt\d+$/, 'Invalid IMDb ID format.'),
  color: z.string(),
});

const FrameCountApiOutputSchema = z.object({
  success: z.boolean(),
  count: z.number().optional(),
  error: z.string().optional(),
});

export type FrameCountApiOutput = z.infer<typeof FrameCountApiOutputSchema>;

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

    const validatedInput = FrameCountApiInputSchema.parse({ movieId, color });

    const framesBasePath = path.join(process.cwd(), 'public', 'frames');
    const colorFolderPath = path.join(framesBasePath, validatedInput.movieId, validatedInput.color);

    try {
      const files = await readdir(colorFolderPath);
      const frameCount = files.filter((file) => file.endsWith('.png')).length;
      return NextResponse.json({ success: true, count: frameCount });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.warn(`Color folder not found for movie ID ${validatedInput.movieId} and color ${validatedInput.color}: ${colorFolderPath}`);
        return NextResponse.json({ success: true, count: 0 });
      }
      console.error(`Error reading color folder for movie ID ${validatedInput.movieId} and color ${validatedInput.color}:`, err);
      return NextResponse.json({ success: false, error: 'Failed to read frame data.' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Validation error fetching frame count:', error.errors);
      return NextResponse.json({ success: false, error: 'Invalid input format.' }, { status: 400 });
    }
    console.error('Unexpected error fetching frame count:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}