import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  const palettePath = path.join(process.cwd(), 'public', 'palettes', `${movieId}.png`);

  if (!fs.existsSync(palettePath)) {
    return NextResponse.json({ error: `Palette image not found for movie ID: ${movieId}` }, { status: 404 });
  }

  try {
    const image = sharp(palettePath);
    const metadata = await image.metadata();

    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const colorCounts = new Map<string, number>();
    const pixelCount = info.width * info.height;

    for (let i = 0; i < pixelCount; i++) {
      const offset = i * info.channels;
      const colorString = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      colorCounts.set(colorString, (colorCounts.get(colorString) || 0) + 1);
    }

    const sortedColors = Array.from(colorCounts.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 15); // Take the top 15

    const colors = sortedColors.map(([colorString, count]) => {
      const [r, g, b] = colorString.split(',').map(Number);
      return { r, g, b, count };
    }
    );


    return NextResponse.json({ success: true, colors });


  } catch (error) {
    console.error(`Error processing palette image for movie ID ${movieId}:`, error);
    return NextResponse.json({ error: 'Failed to process palette image' }, { status: 500 });
  }
}