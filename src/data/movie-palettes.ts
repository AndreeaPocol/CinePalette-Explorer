
export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  palettePath: string; // Path relative to the /public directory, e.g., "/palettes/tt0111161.png"
  framesPath: string; // Path relative to the /public directory, e.g., "/frames/tt0111161/"
}

// NOTE: Ensure the corresponding palette images (e.g., tt0111161.png)
// are placed inside the /public/palettes/ directory.
// NOTE: Ensure the corresponding frame folders (e.g., /public/frames/tt0111161/#COLORHEX) exist.
export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt0111161",
    name: "The Shawshank Redemption (1994)",
    palettePath: "/palettes/tt0111161.png", // Removed /public prefix
    framesPath:  "/frames/tt0111161/" // Removed /public prefix
  },
  {
    id: "tt0068646",
    name: "The Godfather (1972)",
    palettePath: "/palettes/tt0068646.png", // Removed /public prefix
    framesPath:  "/frames/tt0068646/" // Removed /public prefix
  },
  {
    id: "tt0468569",
    name: "The Dark Knight (2008)",
    palettePath: "/palettes/tt0468569.png", // Removed /public prefix
    framesPath:  "/frames/tt0468569/" // Removed /public prefix
  },
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel (2014)",
    palettePath: "/palettes/tt2278388.png", // Removed /public prefix
    framesPath:  "/frames/tt2278388/" // Removed /public prefix
  },
    {
    id: "tt0052784", // Example ID for testing
    name: "North by Northwest (1959)", // Example Name
    palettePath: "/palettes/tt0052784.png", // Removed /public prefix
    framesPath:  "/frames/tt0052784/" // Removed /public prefix
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
