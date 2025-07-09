import { moviePalettes, MoviePaletteData } from "@/data/movie-palettes";
import { getColorAtPixel, hexToHsv } from '@/lib/color-utils';


// Helper function to convert RGB to HSL
interface ColorEntry {
  color: string;
  count: number;
}

export interface MoviePaletteDataWithColorCount extends MoviePaletteData {
  colorCount: number;
  colorProportion: number;
}

// Define the desired order of colors for display
const hsvToColorMap: Record<string, [number, number, number][][]> = {
 'red': [[[0, 160, 50], [9, 255, 255]], [[166, 90, 50], [180, 255, 255]]],
  'orange': [[[10, 196, 110], [20, 255, 255]]],
  'yellow': [[[21, 90, 50], [35, 255, 255]]],
  'green': [[[36, 90, 50], [75, 255, 255]]],
  'cyan': [[[76, 90, 50], [95, 255, 255]]],
  'blue': [[[96, 90, 50], [125, 255, 255]]],
  'purple': [[[126, 90, 50], [145, 255, 255]]],
  'pink': [[[146, 90, 50], [165, 255, 255]]],
};

// Function to check if the HSV value is within the given range
const isWithinRange = (hsvVal: { h: number; s: number; v: number }, rangeGroup: [number, number, number][]): boolean => {
  const [min, max] = rangeGroup;
  const [minH, minS, minV] = min;
  const [maxH, maxS, maxV] = max;

  // Handle hue wrap-around for red
  if (minH > maxH) { // e.g., Red range [166, 9]
    return (
      (hsvVal.h >= minH || hsvVal.h <= maxH) &&
      hsvVal.s >= minS && hsvVal.s <= maxS &&
      hsvVal.v >= minV && hsvVal.v <= maxV
    );
  } else {
    return (
      hsvVal.h >= minH && hsvVal.h <= maxH &&
      hsvVal.s >= minS && hsvVal.s <= maxS &&
      hsvVal.v >= minV && hsvVal.v <= maxV
    );
  }
};

export async function findMoviesByMood(color: string): Promise<Record<string, MoviePaletteDataWithColorCount[]>> {
  // console.log(`findMoviesByMood called with color: ${color}`);

  const resultsByGenre: Record<string, MoviePaletteDataWithColorCount[]> = {};

  // Get all unique genres
  const allGenres = Array.from(new Set(moviePalettes.flatMap(movie => movie.genres)));
  // console.log('All genres:', allGenres);

  // Use Promise.all with .map to fetch and process palettes concurrently
  const moviesWithColorPromises = moviePalettes.map(async (movie) => {
    try {
      // Fetch the palette image (PNG)
      const paletteUrl = `/palettes/${movie.id}.png`;
      // console.log(`Attempting to fetch palette image for movie ${movie.id} from ${paletteUrl}`);
      const response = await fetch(paletteUrl);
      if (!response.ok) {
        console.warn(
          `Could not fetch palette image for movie ${movie.id}: ${response.statusText}`
        );
        return null; // Return null for movies where palette data can't be fetched
      }
      const blob = await response.blob(); // Read the response body ONCE
      // console.log(`Successfully fetched palette image for movie ${movie.id}`);
      try {
      const imageBitmap = await createImageBitmap(blob); // Use the blob for createImageBitmap
      // console.log(`[${movie.id}] ImageBitmap dimensions: ${imageBitmap.width}x${imageBitmap.height}`);
      const paletteData: ColorEntry[] = await processImageForColors(imageBitmap); // Use the ImageBitmap for processing
      // console.log(`[${movie.id}] Processed palette data:`, paletteData);
      // console.log(`Successfully identified colors for movie ${movie.id}`);
      const colorEntry: ColorEntry | undefined = paletteData.find(
        // Find the color entry that matches the selected mood color name
        (entry) => entry.color.toLowerCase() === color.toLowerCase()
      );

      // If a color entry matching the selected mood color name was found, use its count. Otherwise, count is 0.
      const colorCount = colorEntry ? colorEntry.count : 0;

      // Calculate the total number of pixels in the palette image
      const totalPixels = imageBitmap.width * imageBitmap.height; // Use image dimensions for total pixels
      // console.log(`[${movie.id}] colorCount: ${colorCount}, totalPixels: ${totalPixels}`);
      const colorProportion = totalPixels > 0 ? colorCount / totalPixels : 0;
      imageBitmap.close(); // Close ImageBitmap after processing

      return {
        ...movie, // Spread existing movie properties
        colorCount: colorCount, // Keep colorCount for sorting
        colorProportion: colorProportion, // Add the new colorProportion property
      } as MoviePaletteDataWithColorCount; // Explicitly cast to the desired type
      } catch (bitmapError) {
        console.error(`[${movie.id}] Error creating ImageBitmap:`, bitmapError);
        return null; // Return null if ImageBitmap creation fails
      }
    } catch (error) {
      console.error(`[${movie.id}] Error processing palette:`, error);
    }
  });

  // Wait for all promises to resolve
  const moviesWithColorResults = await Promise.all(moviesWithColorPromises);

  // Filter out movies where fetching/processing failed
  const filteredMoviesWithColor = moviesWithColorResults
    .filter((movie): movie is MoviePaletteDataWithColorCount => movie !== null) // Remove null entries from failed fetches/processing and assert type
    .filter(movie => movie.colorProportion >= 0.2); // Apply the 20% threshold

  // Group movies by genre
  for (const genre of allGenres) {
    const moviesForGenre = filteredMoviesWithColor // Use the already thresholded movies
      .filter(movie => movie.genres.map(g => g.toLowerCase()).includes(genre.toLowerCase()))
      // The colorProportion filter above already ensures colorCount > 0 if totalPixels > 0

    // Sort movies within each genre by color count in descending order
    moviesForGenre.sort((a, b) => b.colorCount - a.colorCount);

    // Only add the genre if there are movies in this genre after applying the threshold
    if (moviesForGenre.length > 0) {
      resultsByGenre[genre] = moviesForGenre;
    } else {
      // If no movies match the color and genre after thresholding, do not include the genre
      delete resultsByGenre[genre];
    }
  }
  
  // Consolidate genre groups if they have identical movie lists
  const consolidatedResults: Record<string, MoviePaletteDataWithColorCount[]> = {};
  const genreKeys = Object.keys(resultsByGenre);
  const processedIndices: Set<number> = new Set();

  for (let i = 0; i < genreKeys.length; i++) {
    if (processedIndices.has(i)) continue;

    const currentGenre = genreKeys[i];
    const currentMovieList = resultsByGenre[currentGenre];
    const similarGenres = [currentGenre];

    for (let j = i + 1; j < genreKeys.length; j++) {
      if (processedIndices.has(j)) continue;
      const nextGenre = genreKeys[j];
      const nextMovieList = resultsByGenre[nextGenre];
      if (JSON.stringify(currentMovieList.map(m => m.id)) === JSON.stringify(nextMovieList.map(m => m.id))) {
        similarGenres.push(nextGenre);
        processedIndices.add(j);
      }
    }
    const newGenreName = similarGenres.sort().join(', ');
    consolidatedResults[newGenreName] = currentMovieList;
    processedIndices.add(i);
  }

  return consolidatedResults;
}
/**
 * Processes an image to extract dominant colors and their counts using color quantization.
 * @param imageBitmap - The ImageBitmap to process.
 * @returns A promise that resolves with an array of ColorEntry objects.
 */
async function processImageForColors(imageBitmap: ImageBitmap): Promise<ColorEntry[]> {
  const colorCounts: Map<string, number> = new Map();

  // Initialize counts for each color name in hsvToColorMap
  Object.keys(hsvToColorMap).forEach(colorName => colorCounts.set(colorName, 0));

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    console.error("Could not get canvas context.");
    imageBitmap.close(); // Close ImageBitmap when done
    return [];
  }

  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  // Draw the image onto the canvas
  context.drawImage(imageBitmap, 0, 0);

  // Get the pixel data
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Convert RGBA pixel data to RGB
  // Iterate through pixels and categorize them by HSV range
  for (let i = 0; i < pixels.length; i += 4) {
    // Skip transparent pixels if any (alpha < 128)
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    const colorHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    // if (colorHex === '#000000') {
    //   console.warn("Clicked on black/error area or failed to get color.");
    // }

    const hsv = hexToHsv(colorHex);

    // Check which color category the pixel belongs to
    for (const colorName of Object.keys(hsvToColorMap)) {
      const rangeGroups = hsvToColorMap[colorName];
      if (rangeGroups.some(rangeGroup => isWithinRange(hsv, rangeGroup as [number, number, number][]))) {
        colorCounts.set(colorName, (colorCounts.get(colorName) || 0) + 1);
        break;
      }
    }
  }

  // Convert color map to ColorEntry array
  return Array.from(colorCounts.entries()).map(([color, count]) => ({ color, count }));
}

/**
 * Checks if two colors are similar within a given tolerance using HSL color space.
 * @param color1 - The first color (hex string).
 * @param color2 - The second color (hex string).
 * @param tolerance - The tolerance level (0-100). Lower is stricter.
 * @returns True if the colors are similar, false otherwise.
 */
function areColorsSimilar(color1: string, color2: string, tolerance: number): boolean {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);

  if (!hsl1 || !hsl2) return false;

  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  const saturationDiff = Math.abs(hsl1.s - hsl2.s);
  const lightnessDiff = Math.abs(hsl1.l - hsl2.l);

  // Compare differences against tolerance
  return (
    hueDiff <= tolerance &&
    saturationDiff <= tolerance &&
    lightnessDiff <= tolerance
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
       default: h = 0; // Should not happen
    }
    h /= 6;
  }

  // Convert to 0-100 scale for easier tolerance comparison
  return {
    h: Math.round(h * 100),
    s: Math.round(s * 100),
 l: Math.round(l * 100),
  };
}