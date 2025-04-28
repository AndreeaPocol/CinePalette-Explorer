
export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  palettePath: string; // Path relative to the /public directory, e.g., "/palettes/tt0111161.png"
  framesPath: string;
}

// NOTE: Ensure the corresponding palette images (e.g., tt0111161.png)
// are placed inside the /public/palettes/ directory.
// NOTE: Ensure the corresponding frame folders (e.g., /public/frames/tt0111161/#COLORHEX) exist.
export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt0111161",
    name: "The Shawshank Redemption (1994)",
    palettePath: "/public/palettes/tt0111161.png", // Corrected path prefix
    framesPath:  "/public/frames/tt0111161/"
  },
  {
    id: "tt0068646",
    name: "The Godfather (1972)",
    palettePath: "/public/palettes/tt0068646.png", // Corrected path prefix
    framesPath:  "/public/frames/tt0068646/"
  },
  {
    id: "tt0468569",
    name: "The Dark Knight (2008)",
    palettePath: "/public/palettes/tt0468569.png", // Corrected path prefix
    framesPath:  "/public/frames/tt0468569/"
  },
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel (2014)",
    palettePath: "/public/palettes/tt2278388.png", // Corrected path prefix
    framesPath:  "/public/frames/tt2278388/"
  },
    {
    id: "tt0052784", // Example ID for testing
    name: "North by Northwest (1959)", // Example Name
    palettePath: "/public/palettes/tt0052784.png", // Corrected path prefix
    framesPath:  "/public/frames/tt0052784/"
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
