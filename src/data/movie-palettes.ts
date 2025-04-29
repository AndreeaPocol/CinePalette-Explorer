
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
    name: "The Grand Budapest Hotel",
    palettePath: "/palettes/tt2278388.png",
    framesPath:  "/frames/tt2278388/",
    youtubeKey: "1Fg5iWmQjwk",
  },
  {
    id: "tt0499549",
    name: "Avatar",
    palettePath: "/palettes/tt0499549.png",
    framesPath:  "/frames/tt0499549/",
    youtubeKey: "5PSNL1qE6VY",
  },
  {
    id: "tt0190590",
    name: "O Brother, Where Art Thou?",
    palettePath: "/palettes/tt0190590.png",
    framesPath:  "/frames/tt0190590/",
    youtubeKey: "G7nNDKrTrag",
  }
];

/**
 * Retrieves movie palette data by its ID or name.
 * @param idOrName - The IMDb ID string (e.g., "tt0111161") or the movie name.
 * @returns The MoviePaletteData object if found, otherwise undefined.
 */
export function getMoviePaletteById(idOrName: string): MoviePaletteData | undefined {
  // First, try to find by ID
  if (idOrName && idOrName.startsWith('tt')) {
      const foundById = moviePalettes.find(palette => palette.id === idOrName);
      if(foundById){
        return foundById;
      }
  }
  
  // If not found by ID, try to find by name
  return moviePalettes.find(palette => palette.name.toLowerCase() === idOrName.toLowerCase());
}

/**
 * Retrieves movie palette data by its name.
 * @param name - The movie name
 * @returns The MoviePaletteData object if found, otherwise undefined.
 */
export function getMoviePaletteByName(name: string): MoviePaletteData | undefined {
    return moviePalettes.find(palette => palette.name.toLowerCase() === name.toLowerCase());
}


/**
}

/**
 * Gets all available movie palettes.
 * @returns An array of all MoviePaletteData objects.
 */
export function getAllMoviePalettes(): MoviePaletteData[] {
    return moviePalettes;
}
