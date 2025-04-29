
export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  palettePath: string; // Path relative to the /public directory, e.g., "/palettes/tt0111161.png"
  framesPath: string; // Path relative to the /public directory, e.g., "/frames/tt0111161/"
  youtubeKey: string; // youtube id
}

export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel (2014)",
    palettePath: "/palettes/tt2278388.png",
    framesPath:  "/frames/tt2278388/",
    youtubeKey: "1Fg5iWmQjwk",
  },
  {
    id: "tt0499549",
    name: "Avatar (2009)",
    palettePath: "/palettes/tt0499549.png",
    framesPath:  "/frames/tt0499549/",
    youtubeKey: "5PSNL1qE6VY",
  },
  {
    id: "tt0190590",
    name: "O Brother, Where Art Thou? (2000)",
    palettePath: "/palettes/tt0190590.png",
    framesPath:  "/frames/tt0190590/",
    youtubeKey: "G7nNDKrTrag",
  }
];

/**
 * Retrieves movie palette data by its IMDb ID.
 * @param id - The IMDb ID string (e.g., "tt0111161").
 * @returns The MoviePaletteData object if found, otherwise undefined.
 */
export function getMoviePaletteById(id: string): MoviePaletteData | undefined {
  // Ensure the ID format is roughly correct before searching
  if (!id || !id.startsWith('tt')) {
    return undefined;
  }
  return moviePalettes.find(palette => palette.id === id)
}

/**
 * Gets all available movie palettes.
 * @returns An array of all MoviePaletteData objects.
 */
export function getAllMoviePalettes(): MoviePaletteData[] {
    return moviePalettes;
}
