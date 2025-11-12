'use server';

import munkres from 'munkres';
import Color from 'colorjs.io';
import { getAllMoviePalettes, type MoviePaletteData } from '@/data/movie-palettes';

type ImplementationType = 'hungarian' | 'micd' | 'weighted_micd';
const implementation = 'micd' as ImplementationType;

// --- NEW TYPE DEFINITIONS FOR OPTIMIZATION ---

// 1. Define the type of color data fetched from the API (RGB + count)
type RGBColor = { r: number; g: number; b: number, count: number }; 

// 2. Define the internal color type used for calculations (includes pre-calculated Lab values)
type InternalColor = { 
    red: number; green: number; blue: number; // Original RGB for display in results
    l: number; a: number; b: number; // Lab for fast calculation
    count: number 
};

// Define a type for the colors returned in the detailed mapping (only RGB is needed for UI)
type DisplayColor = Omit<RGBColor, 'count'> & { count: number }; 

// Define a unified return type for clarity (updated to use DisplayColor)
type Mapping = {
    micd: number, 
    palette1To2: { color: DisplayColor, closestInOtherPalette: DisplayColor | null, deltaE: number, weight?: number }[],
    palette2To1: { color: DisplayColor, closestInOtherPalette: DisplayColor | null, deltaE: number, weight?: number }[],
    totalPixels1: number,
    totalPixels2: number,
    totalCost1: number, // Sum of costs (weighted or unweighted) for P1
    totalCost2: number, // Sum of costs (weighted or unweighted) for P2
  };

export interface MICDResult {
    topRecommendations: Array<{
        movie: MoviePaletteData;
        micd: number;
    }>;
    detailedMICDExplanation: Mapping | null;
    error: string;
}

// Helper to extract the RGB and count for the final mapping output
const extractDisplayColor = (ic: InternalColor): DisplayColor => ({
    r: ic.red, g: ic.green, b: ic.blue, count: ic.count
});

// Helper function to calculate Delta E between two Lab colors (FAST)
// This avoids repeated RGB -> Lab conversion inside the loops.
const getDeltaE = (c1: InternalColor, c2: InternalColor): number => {
    try {
        // Instantiate ColorJS objects directly using pre-calculated Lab coords
        // This is much faster than running Color("srgb", ...).to("lab") repeatedly
        const color1Obj = new Color("lab", [c1.l, c1.a, c1.b]);
        const color2Obj = new Color("lab", [c2.l, c2.a, c2.b]);
        
        const deltaE = color1Obj.deltaE2000(color2Obj);
        return (deltaE !== undefined && !isNaN(deltaE)) ? deltaE : Infinity;
    } catch (e) {
        console.warn("Delta E calculation failed.", e);
        return Infinity;
    }
};


const calculateSimilarity = (
colors1: InternalColor[], 
colors2: InternalColor[]
): number | Mapping => {

const numColors1 = colors1.length;
const numColors2 = colors2.length;

// Return Infinity if either palette is empty
if (!numColors1 || !numColors2) return Infinity;

const totalPixels1 = colors1.reduce((sum, color) => sum + color.count, 0);
const totalPixels2 = colors2.reduce((sum, color) => sum + color.count, 0);


// --- 1. Hungarian Algorithm (Optimal 1:1 Matching) ---
if (implementation === 'hungarian') {
    const size = Math.max(numColors1, numColors2);
    const costMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));

    // Fill in the Delta E cost matrix (using fast getDeltaE)
    for (let i = 0; i < numColors1; i++) { 
        for (let j = 0; j < numColors2; j++) {
            costMatrix[i][j] = getDeltaE(colors1[i], colors2[j]);
        }
    }

    const result = munkres(costMatrix); 

    // The result is an array of [row, col] pairs representing the optimal assignment
    const matchedPairs: { color1Index: number; color2Index: number; deltaE: number }[] = result
        .filter((pair: [number, number]) => pair[0] < numColors1 && pair[1] < numColors2) // Filter out padding
        .map((pair: [number, number]) => {
            const deltaE = costMatrix[pair[0]][pair[1]]; // Retrieve cost from the matrix
            return {
                color1Index: pair[0],
                color2Index: pair[1],
                deltaE: deltaE,
            };
        });

    const totalCostSum = matchedPairs.reduce((sum, pair) => sum + pair.deltaE, 0);

    // MICD is the average deltaE of the matched pairs
    const micd = matchedPairs.length > 0 ? totalCostSum / matchedPairs.length : Infinity;

    // Create detailed mapping results (symmetrical mapping), extracting RGB data for display
    const detailedMapping = matchedPairs.map(pair => ({
        color: extractDisplayColor(colors1[pair.color1Index]),
        closestInOtherPalette: extractDisplayColor(colors2[pair.color2Index]),
        deltaE: pair.deltaE,
    }));
    
    // Total cost per color count in the original palettes
    const totalCost1 = numColors1 > 0 ? totalCostSum / numColors1 : Infinity; 
    const totalCost2 = numColors2 > 0 ? totalCostSum / numColors2 : Infinity; 

    return {
        micd: micd,
        palette1To2: detailedMapping,
        palette2To1: detailedMapping,
        totalPixels1: totalPixels1,
        totalPixels2: totalPixels2,
        totalCost1: totalCost1,
        totalCost2: totalCost2,
    };
} 

// --- 2. Simple MICD (Unweighted Mean of Minimum Distances) ---
else if (implementation === 'micd') {
    let totalMinDeltaE1 = 0;
    const palette1To2 = colors1.map(color1 => {
        let minDeltaE = Infinity;
        let closestColor2 = null;
        for (const color2 of colors2) {
            const deltaE = getDeltaE(color1, color2);
            if (deltaE < minDeltaE) {
                minDeltaE = deltaE;
                closestColor2 = color2;
            }
        }
        if (minDeltaE !== Infinity) { totalMinDeltaE1 += minDeltaE; }
        return { 
            color: extractDisplayColor(color1), 
            closestInOtherPalette: closestColor2 ? extractDisplayColor(closestColor2) : null, 
            deltaE: minDeltaE 
        };
    });

    let totalMinDeltaE2 = 0;
    const palette2To1 = colors2.map(color2 => {
        let minDeltaE = Infinity;
        let closestColor1 = null;
        for (const color1 of colors1) {
            const deltaE = getDeltaE(color2, color1); 
            if (deltaE < minDeltaE) {
                minDeltaE = deltaE;
                closestColor1 = color1;
            }
        }
        if (minDeltaE !== Infinity) { totalMinDeltaE2 += minDeltaE; }
        return { 
            color: extractDisplayColor(color2), 
            closestInOtherPalette: closestColor1 ? extractDisplayColor(closestColor1) : null, 
            deltaE: minDeltaE 
        };
    });

    // Average minimum Delta E for each palette
    const avgMinDeltaE1 = numColors1 > 0 ? totalMinDeltaE1 / numColors1 : Infinity;
    const avgMinDeltaE2 = numColors2 > 0 ? totalMinDeltaE2 / numColors2 : Infinity;

    // MICD is the average of the two directional averages
    const micd = (avgMinDeltaE1 + avgMinDeltaE2) / 2;

    return {
        micd: micd,
        palette1To2: palette1To2,
        palette2To1: palette2To1,
        totalPixels1: totalPixels1,
        totalPixels2: totalPixels2,
        totalCost1: totalMinDeltaE1,
        totalCost2: totalMinDeltaE2,
    };
}

// --- 3. Weighted MICD (Weighted Mean of Minimum Distances) ---
else if (implementation === 'weighted_micd') {
    let weightedTotalDeltaE1 = 0;
    let totalWeight1 = 0;
    const palette1To2 = colors1.map(color1 => {
        let minDeltaE = Infinity;
        let closestColor2 = null;
        for (const color2 of colors2) {
            const deltaE = getDeltaE(color1, color2);
            if (deltaE < minDeltaE) {
                minDeltaE = deltaE;
                closestColor2 = color2;
            }
        }
        if (minDeltaE !== Infinity) {
            weightedTotalDeltaE1 += minDeltaE * color1.count;
            totalWeight1 += color1.count;
        }
        return { 
            color: extractDisplayColor(color1), 
            closestInOtherPalette: closestColor2 ? extractDisplayColor(closestColor2) : null, 
            deltaE: minDeltaE, 
            weight: color1.count 
        };
    });

    let weightedTotalDeltaE2 = 0;
    let totalWeight2 = 0;
    const palette2To1 = colors2.map(color2 => {
        let minDeltaE = Infinity;
        let closestColor1 = null;
        for (const color1 of colors1) {
            const deltaE = getDeltaE(color2, color1); 
            if (deltaE < minDeltaE) {
                minDeltaE = deltaE;
                closestColor1 = color1;
            }
        }
        if (minDeltaE !== Infinity) {
            weightedTotalDeltaE2 += minDeltaE * color2.count;
            totalWeight2 += color2.count;
        }
        return { 
            color: extractDisplayColor(color2), 
            closestInOtherPalette: closestColor1 ? extractDisplayColor(closestColor1) : null, 
            deltaE: minDeltaE, 
            weight: color2.count 
        };
    });

    // Weighted Average minimum Delta E for each palette
    const weightedAvgMinDeltaE1 = totalWeight1 > 0 ? weightedTotalDeltaE1 / totalWeight1 : Infinity;
    const weightedAvgMinDeltaE2 = totalWeight2 > 0 ? weightedTotalDeltaE2 / totalWeight2 : Infinity;

    // Weighted MICD is the average of the two directional weighted averages
    const micd = (weightedAvgMinDeltaE1 + weightedAvgMinDeltaE2) / 2;

    return {
        micd: micd,
        palette1To2: palette1To2,
        palette2To1: palette2To1,
        totalPixels1: totalPixels1,
        totalPixels2: totalPixels2,
        totalCost1: weightedTotalDeltaE1, // Total weighted cost
        totalCost2: weightedTotalDeltaE2, // Total weighted cost
    };
}

// Fallback for unknown implementation type
console.error(`Unknown implementation method: ${implementation}`);
return Infinity;
};

  
const fetchPaletteColors = async (movieId: string): Promise<InternalColor[] | null> => {
    // Construct the absolute URL for server-side fetch calls.
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:9002`;

    try {
        const url = `${baseUrl}/api/palette-colors?movieId=${movieId}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching palette colors: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.success && data.colors) {
            // Convert RGB to Lab here, once per color
            const rgbColors = data.colors as RGBColor[];
            const internalColors: InternalColor[] = rgbColors.map(c => {
                // Perform the expensive conversion here
                const colorObj = new Color("srgb", [c.r / 255, c.g / 255, c.b / 255]).to("lab");
                // Lab coordinates are stored as a three-element array [L, a, b]
                const [l, a, b] = colorObj.coords; 
                return {
                    // Store both RGB (for display) and Lab (for calculation)
                    red: c.r, green: c.g, blue: c.b, 
                    l: l, a: a, b: b,
                    count: c.count
                };
            });
            return internalColors;
        } else {
            throw new Error(data.error || 'Failed to fetch palette colors');
        }
    } catch (error) {
        console.error(`An error occurred while fetching colors: ${error}`);
        return null;
    }
};

export async function findMostSimilarMovie(selectedMovieId: string): Promise<MICDResult> {
    try {
      // selectedMovieColors is now InternalColor[]
      const selectedMovieColors = await fetchPaletteColors(selectedMovieId);
      if (!selectedMovieColors) {
        throw new Error(`Failed to fetch colors for movie with ID ${selectedMovieId}.`);
      }

      const allMovies: MoviePaletteData[] = getAllMoviePalettes()

      // --- OPTIMIZATION: Convert sequential loop to parallel execution using Promise.all ---
      const comparisonPromises = allMovies.map(async (candidateMovie) => {
        if (candidateMovie.id === selectedMovieId) return null; // Skip the selected movie itself

        // Fetch and convert colors for the candidate movie (returns InternalColor[])
        const candidateColors = await fetchPaletteColors(candidateMovie.id);
        if (!candidateColors || candidateColors.length === 0) return null; 

        // calculateSimilarity uses the fast Lab-to-Lab comparison
        const micdResult = calculateSimilarity(selectedMovieColors, candidateColors);

        const micd = typeof micdResult === 'number' ? micdResult : micdResult.micd;

        // Return the similarity score and the movie
        return { movie: candidateMovie, micd: micd };
      });
      
      // Wait for ALL promises to resolve concurrently.
      const results = await Promise.all(comparisonPromises);

      // Filter out null results (skipped movies) and sort
      const similarityScores = results.filter((r): r is { movie: MoviePaletteData, micd: number } => r !== null);
      
      // Sort by MICD to find the top 3
      similarityScores.sort((a, b) => a.micd - b.micd);

      // Take the top 3
      const topThreeRecommendations = similarityScores.slice(0, 3);

      // Calculate and store detailed explanation for the *first* best match only
      if (topThreeRecommendations.length > 0) {
        // Fetch colors for the recommended movie to calculate detailed MICD (returns InternalColor[])
        const recommendedMovieColors = await fetchPaletteColors(topThreeRecommendations[0].movie.id);
        if (!recommendedMovieColors) {
            throw new Error(`Failed to fetch colors for recommended movie: ${topThreeRecommendations[0].movie.name}`);
        } else {
          const detailedResult = calculateSimilarity(selectedMovieColors, recommendedMovieColors) as Mapping;
          return {topRecommendations: topThreeRecommendations, detailedMICDExplanation: detailedResult, error: ''} as MICDResult;
        }
      } else {
        return {topRecommendations: [], detailedMICDExplanation: null, error: 'No similar palette found.'} as MICDResult; // Clear detailed explanation if no recommendation found
      }
    } catch (error) {
      console.error("Error finding similar movie:", error);
      return {topRecommendations: [], detailedMICDExplanation: null, error: `An error occurred while finding a recommendation: ${error}`} as MICDResult;
    }
}