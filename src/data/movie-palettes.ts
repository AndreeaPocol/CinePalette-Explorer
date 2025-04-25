
export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  palettePath: string; // Path relative to the /public directory, e.g., "/palettes/tt0111161.png"
  colors: string[]; // Hex codes for the swatches, e.g., ["#AABBCC", "#DDEEFF"]
}

// NOTE: Ensure the corresponding palette images (e.g., tt0111161.png)
// are placed inside the /public/data/ directory.
// NOTE: Ensure the corresponding frame folders (e.g., /public/frames/tt0111161/#COLORHEX) exist.
export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt0111161",
    name: "The Shawshank Redemption (1994)",
    palettePath: "/data/tt0111161.png", // Corrected path prefix
    colors: ["#2A2A2A", "#5F6A71", "#8C939A", "#BFC8CE", "#E4E7EA"] // Example colors
  },
  {
    id: "tt0068646",
    name: "The Godfather (1972)",
    palettePath: "/data/tt0068646.png", // Corrected path prefix
    colors: ["#1E1A1D", "#4D3B33", "#8F6F54", "#C8A788", "#EEDDC7"] // Example colors
  },
  {
    id: "tt0468569",
    name: "The Dark Knight (2008)",
    palettePath: "/data/tt0468569.png", // Corrected path prefix
    colors: ["#0D1B2A", "#1B263B", "#415A77", "#778DA9", "#E0E1DD"] // Example colors
  },
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel (2014)",
    palettePath: "/data/tt2278388.png", // Corrected path prefix
    colors: ["#F1D4AF", "#E0AFA0", "#A97C73", "#8C5E58", "#4A314D"] // Example colors
  },
    {
    id: "tt0052784", // Example ID for testing
    name: "North by Northwest (1959)", // Example Name
    palettePath: "/data/tt0052784.png", // Corrected path prefix
    colors: ["#3D5A80", "#98C1D9", "#E0FBFC", "#EE6C4D", "#293241"] // Example colors
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
  return moviePalettes.find(palette => palette.id === id);
}

/**
 * Gets all available movie palettes.
 * @returns An array of all MoviePaletteData objects.
 */
export function getAllMoviePalettes(): MoviePaletteData[] {
    return moviePalettes;
}
