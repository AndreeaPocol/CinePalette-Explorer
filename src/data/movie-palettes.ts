export interface MoviePaletteData {
  id: string;
  name: string; // e.g., "The Shawshank Redemption"
  palettePath: string;
  colors: string[]; // Hex codes, e.g., ["#AABBCC", "#DDEEFF"]
}

// NOTE: You need to add the corresponding images to the /public/palettes/ directory.
// Example: /public/palettes/tt0111161.png
export const moviePalettes: MoviePaletteData[] = [
  {
    id: "tt0111161",
    name: "The Shawshank Redemption (1994)",
    palettePath: "/palettes/tt0111161.png",
    colors: ["#2c3e50", "#bdc3c7", "#3a506b", "#5bc0de", "#1c2541"] // Example colors, replace with actual extracted colors if possible
  },
  {
    id: "tt0068646",
    name: "The Godfather (1972)",
    palettePath: "/palettes/tt0068646.png",
    colors: ["#000000", "#4d4d4d", "#a37c39", "#800000", "#d4af37"] // Example colors
  },
  {
    id: "tt0468569",
    name: "The Dark Knight (2008)",
    palettePath: "/palettes/tt0468569.png",
    colors: ["#000000", "#34495e", "#1abc9c", "#f39c12", "#bdc3c7"] // Example colors
  },
  {
    id: "tt1375666",
    name: "Inception (2010)",
    palettePath: "/palettes/tt1375666.png",
    colors: ["#2c3e50", "#e74c3c", "#ecf0f1", "#3498db", "#95a5a6"] // Example colors
  },
  {
    id: "tt0137523",
    name: "Fight Club (1999)",
    palettePath: "/palettes/tt0137523.png",
    colors: ["#1f2d3d", "#ecf0f1", "#e74c3c", "#95a5a6", "#34495e"] // Example colors
  },
];

export function getMoviePaletteById(id: string): MoviePaletteData | undefined {
  return moviePalettes.find(palette => palette.id === id);
}
