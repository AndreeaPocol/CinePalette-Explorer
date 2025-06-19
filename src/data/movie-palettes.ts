
export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  youtubeKey: string; // youtube id
}

export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel",
    youtubeKey: "1Fg5iWmQjwk",
  },
  {
    id: "tt0499549",
    name: "Avatar",
    youtubeKey: "5PSNL1qE6VY",
  },
  {
    id: "tt0190590",
    name: "O Brother, Where Art Thou?",
    youtubeKey: "G7nNDKrTrag",
  },
  {
    id: "tt0317705",
    name: "The Incredibles",
    youtubeKey: "-UaGUdNJdRQ",
  },
  {
    id: "tt1483013",
    name: "Oblivion",
    youtubeKey: "tx6_JMDFfWI",
  },
  {
    id: "tt0240772",
    name: "Ocean's Eleven",
    youtubeKey: "ImMGNQ2OEjo",
  },
  {
    id: "tt0081505",
    name: "The Shining",
    youtubeKey: "S014oGZiSdI",
  },
  {
    id: "tt0373889",
    name: "Harry Potter and the Order of the Phoenix",
    youtubeKey: "47PHbQTmw5g",
  },
  {
    id: "tt0417741",
    name: "Harry Potter and the Half-Blood Prince",
    youtubeKey: "JYLdTuL9Wjw",
  },
  {
    id: "tt0848228",
    name: "The Avengers",
    youtubeKey: "eOrNdBpGMv8",
  },
  {
    id: "tt2395427",
    name: "Avengers: Age of Ultron",
    youtubeKey: "MZoO8QVMxkk",
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
