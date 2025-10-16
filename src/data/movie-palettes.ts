
export interface MoviePaletteData {
  id: string; // tconst
  name: string; // e.g., "The Shawshank Redemption"
  youtubeKey: string; // youtube key
  genres: string[];
  posterUrl: string;
}

export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt2278388",
    name: "The Grand Budapest Hotel",
    youtubeKey: "1Fg5iWmQjwk",
    genres: ["Adventure", "Comedy", "Crime"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMzM5NjUxOTEyMl5BMl5BanBnXkFtZTgwNjEyMDM0MDE@._V1_SX300.jpg",
  },
  {
    id: "tt0499549",
    name: "Avatar",
    youtubeKey: "5PSNL1qE6VY",
    genres: ["Action", "Adventure", "Fantasy"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BZDA0OGQxNTItMDZkMC00N2UyLTg3MzMtYTJmNjg3Nzk5MzRiXkEyXkFqcGdeQXVyMjUzOTY1NTc@._V1_SX300.jpg",
  },
  {
    id: "tt0190590",
    name: "O Brother, Where Art Thou?",
    youtubeKey: "G7nNDKrTrag",
    genres: ["Adventure", "Comedy", "Crime"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMjZkOTdmMWItOTkyNy00MDdjLTlhNTQtYzU3MzdhZjA0ZDEyXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
  },
  {
    id: "tt0317705",
    name: "The Incredibles",
    youtubeKey: "-UaGUdNJdRQ",
    genres: ["Animation", "Action", "Adventure"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTY5OTU0OTc2NV5BMl5BanBnXkFtZTcwMzU4MDcyMQ@@._V1_SX300.jpg",
  },
  {
    id: "tt1483013",
    name: "Oblivion",
    youtubeKey: "tx6_JMDFfWI",
    genres: ["Action", "Adventure", "Sci-Fi"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTQwMDY0MTA4MF5BMl5BanBnXkFtZTcwNzI3MDgxOQ@@._V1_SX300.jpg",
  },
  {
    id: "tt0240772",
    name: "Ocean's Eleven",
    youtubeKey: "ImMGNQ2OEjo",
    genres: ["Crime", "Thriller"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BYzVmYzVkMmUtOGRhMi00MTNmLThlMmUtZTljYjlkMjNkMjJkXkEyXkFqcGdeQXVyNDk3NzU2MTQ@._V1_SX300.jpg",
  },
  {
    id: "tt0081505",
    name: "The Shining",
    youtubeKey: "S014oGZiSdI",
    genres: ["Drama", "Horror"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BZWFlYmY2MGEtZjVkYS00YzU4LTg0YjQtYzY1ZGE3NTA5NGQxXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg",
  },
  {
    id: "tt0373889",
    name: "Harry Potter and the Order of the Phoenix",
    youtubeKey: "47PHbQTmw5g",
    genres: ["Action", "Adventure", "Family"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BOTA3MmRmZDgtOWU1Ny00ZDc5LWFkN2YtNzNlY2UxZmY0N2IyXkEyXkFqcGdeQXVyNTIzOTk5ODM@._V1_SX300.jpg",
  },
  {
    id: "tt0417741",
    name: "Harry Potter and the Half-Blood Prince",
    youtubeKey: "JYLdTuL9Wjw",
    genres: ["Action", "Adventure", "Family"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BNzU3NDg4NTAyNV5BMl5BanBnXkFtZTcwOTg2ODg1Mg@@._V1_SX300.jpg",
  },
  {
    id: "tt0848228",
    name: "The Avengers",
    youtubeKey: "eOrNdBpGMv8",
    genres: ["Action", "Sci-Fi"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BNDYxNjQyMjAtNTdiOS00NGYwLWFmNTAtNThmYjU5ZGI2YTI1XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
  },
  {
    id: "tt2395427",
    name: "Avengers: Age of Ultron",
    youtubeKey: "MZoO8QVMxkk",
    genres: ["Action", "Adventure", "Sci-Fi"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTM4OGJmNWMtOTM4Ni00NTE3LTg3MDItZmQxYjc4N2JhNmUxXkEyXkFqcGdeQXVyNTgzMDMzMTg@._V1_SX300.jpg",
  },
  {
    id: "tt12934940",
    name: "On the Line",
    youtubeKey: "Ivl_vizw1TA",
    genres: ["Thriller"],
    posterUrl: "https://image.tmdb.org/t/p/original/72X2UIE98b2ubP4NVmDMjLumaPO.jpg", // "https://m.media-amazon.com/images/M/MV5BOWZlNGZiMWEtZGU1OC00MWM0LTkyYTQtYmE5YjM0MTQ2YmQxXkEyXkFqcGdeQXVyMTE5MTgxNTk2._V1_SX300.jpg",
  },
  {
    id: "tt14775748",
    name: "Rehana",
    youtubeKey: "WZNCRsVhvx8",
    genres: ["Drama"],
    posterUrl: "https://image.tmdb.org/t/p/original/1ZTvygaE3yMdYnV44pynFIyKtSF.jpg", // "https://m.media-amazon.com/images/M/MV5BY2EzYTJkNmItNzQ4OS00OWNkLTljZDItYTJiYjJjNWRjOGZmXkEyXkFqcGdeQXVyNjYyMTEyMzI@._V1_SX300.jpg",
  },
  {
    id: "tt2147374",
    name: "Fogo",
    youtubeKey: "7UsMhBpBg2o",
    genres: ["Drama"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMjc5MmMzYjktNGY2NS00OGNhLTkxYjAtOWVkMDk3MzhiNDYxXkEyXkFqcGc@._V1_.jpg",
  },
  {
    id: "tt2536366",
    name: "Sitting Next to Zoe",
    youtubeKey: "qWqu5uwXq8s",
    genres: ["Comedy", "Drama", "Family"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTgwOTIwNDAzNV5BMl5BanBnXkFtZTgwOTE4Mzg1MDE@._V1_SX300.jpg",
  },
  {
    id: "tt3922754",
    name: "Ardennes Fury",
    youtubeKey: "R1fX9zjuaR8",
    genres: ["Action", "War"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTAzODQ0MjEwMjZeQTJeQWpwZ15BbWU4MDQ4MzUzNDIx._V1_SX300.jpg",
  },
  {
    id: "tt14230388",
    name: "Asteroid City",
    youtubeKey: "9FXCSXuGTF4",
    genres: ["Comedy", "Drama", "Romance"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BNDJmMzY0ZGUtYWE1My00OWViLTg1NTctOWMwZWJlNDQzNGRiXkEyXkFqcGdeQXVyMjkwOTAyMDU@._V1_SX300.jpg"
  },
  {
    id: "tt0344510",
    name: "A Very Long Engagement",
    youtubeKey: "2HJXPvM1y2E",
    genres: ["Drama", "Mystery", "Romance"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BZWI4ZTgwMzktNjk3Yy00OTlhLTg3YTAtMTA1MWVlMWJiOTRiXkEyXkFqcGdeQXVyMTAwMzUyOTc@._V1_SX300.jpg"
  },
  {
    id: "tt0096895",
    name: "Batman",
    youtubeKey: "dgC9Q0uhX70",
    genres: ["Action", "Adventure"],
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTYwNjAyODIyMF5BMl5BanBnXkFtZTYwNDMwMDk2._V1_SX300.jpg"
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
