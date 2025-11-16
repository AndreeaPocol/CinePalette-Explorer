'use client';

import munkres from 'munkres';
import Color from 'colorjs.io';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import type { ReactElement, SyntheticEvent } from 'react';
import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMoviePaletteById, getAllMoviePalettes, type MovieMetadata } from '@/data/movie-palettes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, AlertCircle, X, ArrowLeft, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { getColorFrameFoldersPaginated, type GetColorFrameFoldersPaginationOutput, FrameData } from '@/actions/get-color-frames';
import { getColorAtPixel, hexToHsv } from '@/lib/color-utils';
import { explainColorPalette } from '@/ai/flows/explain-color-palette';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { TrailerFileApiOutput } from '@/app/api/trailer-file/route';
import Link from "next/link";
import { findMoviesByMood } from '@/movie-mood-finder';
import { MovieListDialog } from "@/components/movie-list-dialog";
import { RecommendationExplanationPanel, type MappingResult, RecommendationResult } from "@/components/recommendation-explanation-panel";
import type { MovieColorPaletteData } from '@/movie-mood-finder';
import { pLimit } from '@/lib/p-limit';
import { PaletteService, ColorProportion } from '@/data/retrieve-palette';
import { PaletteVisualizer } from '@/components/color-palette-visualizer';


export default function CinePaletteExplorer(): ReactElement {
  const [isFrameModalOpen, setIsFrameModalOpen] = useState<boolean>(false); // State to control the visibility of the frame modal
  const [isOpen, setIsOpen] = useState<boolean>(false); // State to control the visibility of the movie list dialog
  const [suggestion, setSuggestion] = useState<string>(''); // State for the search input suggestion
  const [inputValue, setInputValue] = useState<string>(''); // State to hold the user's input for movie ID or name
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false); // State to indicate if the user is browsing movies
  const [isMovieSelected, setIsMovieSelected] = useState<boolean>(false); // State to indicate if a movie is selected

  const [selectedMovieId, setSelectedMovieId] = useState<string>(''); // State to store the selected movie's ID
  const [selectedMovieData, setSelectedMovieData] = useState<MovieMetadata | null>(null); // State to store the data of the selected movie
  const [selectedMoviePalettePath, setSelectedMoviePalettePath] = useState<string | null>(null); // State to store the palette path of the selected movie
  const paletteImageRef = useRef<HTMLImageElement>(null); // Ref to the palette image element
  const [error, setError] = useState<string | null>(null); // State to store error messages

  const [selectedFramePath, setSelectedFramePath] = useState<string | null>(null); // State to store the path of the selected frame for display in the modal
  const [trailerImagePath, setTrailerImagePath] = useState<string | null>(null); // State to store the path of the trailer image for display in the modal

  const [selectedColor, setSelectedColor] = useState<string | null>(null); // State to store the currently selected color folder
  const [paletteImageError, setPaletteImageError] = useState<boolean>(false); // State to track if there's an error loading the palette image
  const [frameErrors, setFrameErrors] = useState<Record<string, Record<string, boolean>>>({}); // State to track loading errors for each frame
  const [colorExplanation, setColorExplanation] = useState<string | null>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null); // State to track errors for explanations
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [detailedMICDExplanation, setDetailedMICDExplanation] = useState<MappingResult | null >(null); // Moved state declaration outside useCallback

  const [topRecommendations, setTopRecommendations] = useState<RecommendationResult[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState<boolean>(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const [moodColor, setMoodColor] = useState<string>('');
  const [moodMovies, setMoodMovies] = useState<Record<string, MovieColorPaletteData[]>>({});
  const [isLoadingMoodSearch, setIsLoadingMoodSearch] = useState<boolean>(false);
  const [implementation, setImplementation] = useState<'hungarian' | 'micd' | 'weighted_micd' | 'weighted_hungarian'>('weighted_micd'); // Hungarian doesn't work for palettes of different lengths
  const [noMoodResults, setNoMoodResults] = useState<boolean>(false);

  // --- Pagination State for Frames ---
  const [paginatedFrames, setPaginatedFrames] = useState<FrameData[]>([]);
  const [isLoadingMoreFrames, setIsLoadingMoreFrames] = useState(false);
  const [hasMoreFrames, setHasMoreFrames] = useState(false);
  const [currentFramePage, setCurrentFramePage] = useState(0);

  const [isServiceReady, setIsServiceReady] = useState(false);

  const FRAME_PAGE_SIZE = 20;

  const [showDetails, setShowDetails] = useState(false);

  const resetState = () => {
    setFrameErrors({});
    setSelectedColor(null);
    setPaletteImageError(false);
    setPaginatedFrames([]);
    setColorExplanation('');
    setCurrentFramePage(0);
    setHasMoreFrames(false);
    setIsLoadingMoreFrames(false);
    setIsLoadingExplanation(false);
  }

  useEffect(() => {
    const initializeService = async () => {
        try {
            console.log('Attempting to load essential data...');
            
            // This is where the AWAIT must happen. It is outside of the render cycle.
            await paletteService.loadPalettes();
            
            // Once the promise resolves, we signal to the component that synchronous lookups are safe.
            setIsServiceReady(true);
            console.log('Data service initialized and ready!');
        } catch (error) {
            console.log('Error: Failed to initialize service data.');
            console.error("Initialization Error:", error);
        }
    };
  
    initializeService();
  }, []); // Empty dependency array means it runs only once on mount.

  // FAST Local Movie Data Loading
  useEffect(() => {
    if (selectedMovieId === '') {
      setSelectedMovieData(null);
      setSelectedMoviePalettePath(null);
      setIsMovieSelected(false);
      return;
    }
    
    // Get movie data (synchronous lookup using the validated ID)
    const movieData = getMoviePaletteById(selectedMovieId);

    if (movieData) {
      // Set the UI-critical data
      setSelectedMovieData(movieData);
      setSelectedMoviePalettePath(path.join(process.cwd(), 'palettes', `${movieData.id}.png`));
      setIsMovieSelected(true);
      setError(null);
      resetState();
      
      findMostSimilarMovie();
    } 
    else {
      // This 'else' only serves as a data integrity guardrail,
      // as the submit handler should prevent it from running for invalid input.
      setSelectedMovieData(null);
      setSelectedMoviePalettePath(null);
      setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
      setIsMovieSelected(false);
      
      resetState();
    }
  }, [selectedMovieId]);

  /**
   * Fetches the next page of frames for the currently selected color
   * and appends them to the paginatedFrames state.
   */
  const loadMoreFrames = useCallback(async () => {
    if (isLoadingMoreFrames || !hasMoreFrames || !selectedMovieId || !selectedColor) return;

    setIsLoadingMoreFrames(true);
    const nextPage = currentFramePage + 1;

    try {
      // Fetch the next page (page number is 0-indexed)
      const result = await getColorFrameFoldersPaginated({
        movieId: selectedMovieId,
        color: selectedColor,
        page: nextPage,
        pageSize: FRAME_PAGE_SIZE,
      }) as GetColorFrameFoldersPaginationOutput; // Cast to new type

      if (result.error) {
        throw new Error(result.error);
      }

      // Append new frames to the existing list
      setPaginatedFrames(prevFrames => [...prevFrames, ...result.frames]);
      setHasMoreFrames(result.hasMore);
      setCurrentFramePage(nextPage);
    } catch (e: any) {
      console.error("Failed to load more frames:", e);
      setError("Could not load more frames. Please try again.");
      setHasMoreFrames(false); // Stop trying to load
    } finally {
      setIsLoadingMoreFrames(false);
    }
  }, [isLoadingMoreFrames, hasMoreFrames, selectedMovieId, selectedColor, currentFramePage]);

  const handleBrowseClick = () => {
    setIsBrowsing(true);
    setError(null);
  };

  const fetchPaletteColors = useCallback((
    movieId: string
  ): ColorProportion[] => {
    // CRITICAL GUARD: Do not attempt to read data if the service is not ready.
    if (!isServiceReady) {
        console.error("Attempted fetch before service ready. Aborting.");
        // If the user tries to change the movie before data is loaded, we ignore the request.
        return []; 
    }
    try {
        // This synchronous call is now guaranteed to succeed because the guard check passed.
        const colors : ColorProportion[] = paletteService.getPaletteByTconst(movieId);
        if (colors.length === 0) {
          throw new Error(`Empty list of colors returned by getPaletteByTconst for ${movieId}`)
        }
        console.log(`Successfully loaded palette for ${allMovies.find(m => m.id === movieId)?.name || 'movie'}.`);
        return colors;
    } catch (error) {
        console.error("Fetch Error (Should not happen if isServiceReady is true):", error);
        return [];
    }
  }, [isServiceReady]); // Depends on readiness state


  // Calculate (dis)similarity between two palettes
  const calculateSimilarity = useCallback((
    colors1: ColorProportion[], 
    colors2: ColorProportion[],
  ): null | MappingResult => {

    const numColors1 = colors1.length;
    const numColors2 = colors2.length;
    
    // Return null if either palette is empty
    if (!numColors1 || !numColors2) {
      console.error(`Cannot calculate similarity; numColors1 (${numColors1}) or numColors2 (${numColors2}) is 0.`);
      return null;
    }

    // Helper function to calculate Delta E between two RGB colors (0-255)
    const getDeltaE = (
      c1: ColorProportion, 
      c2: ColorProportion
    ): number | null => {
        try {
            const color1Obj = new Color("srgb", [c1.r / 255, c1.g / 255, c1.b / 255]).to("lab");
            const color2Obj = new Color("srgb", [c2.r / 255, c2.g / 255, c2.b / 255]).to("lab");
            const deltaE = color1Obj.deltaE2000(color2Obj);
            return (deltaE !== undefined && !isNaN(deltaE)) ? deltaE : Infinity;
        } catch (e) {
            console.warn("Delta E calculation failed.", e);
            return null;
        }
    };

    const getEuclideanLabDistance = (
      c1: ColorProportion, 
      c2: ColorProportion,
    ): number | null => {
      try {
          // 1. Convert RGB (0-255) to sRGB (0-1) and then to LAB space.
          // The .coords property of the LAB color object typically holds [L, a, b].
          
          // This line depends on the specific Color library being used:
          // Assuming the Color class is globally available for context.
          const color1Lab = new Color("srgb", [c1.r / 255, c1.g / 255, c1.b / 255]).to("lab");
          const color2Lab = new Color("srgb", [c2.r / 255, c2.g / 255, c2.b / 255]).to("lab");

          const [L1, a1, b1] = color1Lab.coords as [number, number, number];
          const [L2, a2, b2] = color2Lab.coords as [number, number, number];

          // 2. Calculate the squared differences for L, a, and b
          const dL = L2 - L1;
          const da = a2 - a1;
          const db = b2 - b1;

          // 3. Compute the Euclidean distance (square root of the sum of squared differences)
          // D = sqrt( dL^2 + da^2 + db^2 )
          const distance = Math.sqrt(
              Math.pow(dL, 2) + Math.pow(da, 2) + Math.pow(db, 2)
          );

          // Check if the result is valid
          return (!isNaN(distance) && isFinite(distance)) ? distance : Infinity;

      } catch (e) {
          // Log a warning if the color conversion or calculation fails
          console.error("Euclidean LAB distance calculation failed.", e);
          return null;
      }
    };
    
    // --- 1. Weighted Hungarian Algorithm (Combined Cost) ---
    if (implementation === 'weighted_hungarian') {
        // Default weights for combined cost matrix (can be externalized if needed)
        const WEIGHT_COLOR = 0.6; 
        const WEIGHT_PROPORTION = 0.4; 
        // using 100 as the maximum to normalize the raw Delta E scores (which ranges from 0 to ~100) down to a value between 0 and 1. 
        // This normalization is critical because it ensures that when we calculate the combined cost
        // Cost = Normalized Delta E * 0.5 + Proportion Difference * 0.5
        // The two components are weighted on a similar scale (0 to 1), preventing the Delta E component from overwhelming the proportion component.

        const MAX_LAB_DIST_NORM = 100.0; // Typical max Delta E for normalization
        const UNMATCHED_PENALTY_PER_UNIT_PROPORTION = WEIGHT_PROPORTION;

        // Populate the cost matrix
        const n1 = numColors1;
        const n2 = numColors2;
        const size = Math.max(n1, n2);

        // Combined Weighted Cost (used for optimal assignment)
        const costMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              if (i < n1 && j < n2) {
                // Case 1: Real color to Real color match
                const c1 = colors1[i];
                const c2 = colors2[j];
                const deltaE = getEuclideanLabDistance(colors1[i], colors2[j]);
                if (deltaE === null) {
                  console.error("Stopping comparison logic because deltaE is null.");
                  return null;
                }

                // Calculate combined weighted cost for assignment
                const colorDiffNorm = deltaE / MAX_LAB_DIST_NORM;
                const proportionDiff = Math.abs(c1.proportion - c2.proportion);

                costMatrix[i][j] = 
                    (colorDiffNorm * WEIGHT_COLOR) + 
                    (proportionDiff * WEIGHT_PROPORTION);
                      
              } else if (i < n1 && j >= n2) {
                  // Case 2: P1 color unmatched (matched with a dummy from P2)
                  costMatrix[i][j] = colors1[i].proportion * UNMATCHED_PENALTY_PER_UNIT_PROPORTION;
              } else if (i >= n1 && j < n2) {
                  // Case 3: P2 color unmatched (matched with a dummy from P1)
                  costMatrix[i][j] = colors2[j].proportion * UNMATCHED_PENALTY_PER_UNIT_PROPORTION;
              }
              // Case 4: Dummy-Dummy match (cost remains 0)
            }
        }

        // Find the optimal assignment using the combined weighted cost matrix
        const assignmentPairs = munkres(costMatrix); 

        // Calculate final metrics based on the assignment
        let totalDissimilarity = 0;
        const matchedPairs: { color: any; closestInOtherPalette: any; difference: number; }[] = [];

        for (const [row, col] of assignmentPairs) {
          if ((row >= n1) || (col >= n2)) { // this was a dummy colour and will screw up the mapping later on if we don't omit it
            continue
          }
          // Retrieve cost from the matrix
          const cost = costMatrix[row][col];
          // Sum the combined weighted cost for the total dissimilarity score
          totalDissimilarity += cost;
          
          matchedPairs.push({
              color: colors1[row],
              closestInOtherPalette: colors2[col],
              difference: cost,
          });
        }

        return {
            score: totalDissimilarity,
            palette1To2: matchedPairs,
            palette2To1: matchedPairs, // Symmetrical mapping
            totalCost1: totalDissimilarity, // Total dissimilarity (ranking score)
            totalCost2: totalDissimilarity, // Total dissimilarity (ranking score)
        } as MappingResult;
    // --- 2. Hungarian Algorithm (Optimal 1:1 Matching) ---
    } else if (implementation === 'hungarian') {
        const size = Math.max(numColors1, numColors2);
        const costMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));

        // Fill in the Delta E cost matrix
        for (let i = 0; i < numColors1; i++) { 
            for (let j = 0; j < numColors2; j++) {
              const result = getDeltaE(colors1[i], colors2[j]);
              if (result === null) {
                console.error("Stopping comparison logic because deltaE is null.");
                return null;
              }
              costMatrix[i][j] = result;
            }
        }

        const result = munkres(costMatrix); 

        // The result is an array of [row, col] pairs representing the optimal assignment
        const matchedPairs: { color1Index: number; color2Index: number; difference: number }[] = result
            .filter((pair: [number, number]) => pair[0] < numColors1 && pair[1] < numColors2) // Filter out padding
            .map((pair: [number, number]) => {
                const deltaE = costMatrix[pair[0]][pair[1]]; // Retrieve cost from the matrix
                return {
                    color1Index: pair[0],
                    color2Index: pair[1],
                    difference: deltaE,
                };
            });

        const totalCostSum = matchedPairs.reduce((sum, pair) => sum + pair.difference, 0);

        // score is the average deltaE of the matched pairs
        const score = matchedPairs.length > 0 ? totalCostSum / matchedPairs.length : Infinity;

        // Create detailed mapping results (symmetrical mapping)
        const detailedMapping = matchedPairs.map(pair => ({
            color: colors1[pair.color1Index],
            closestInOtherPalette: colors2[pair.color2Index],
            difference: pair.difference,
        }));
        
        // Total cost per color count in the original palettes
        const totalCost1 = numColors1 > 0 ? totalCostSum / numColors1 : Infinity; 
        const totalCost2 = numColors2 > 0 ? totalCostSum / numColors2 : Infinity; 

        return {
            score: score,
            palette1To2: detailedMapping,
            palette2To1: detailedMapping,
            totalCost1: totalCost1,
            totalCost2: totalCost2,
        };
    } 
    
    // --- 3. Simple MICD (Unweighted Mean of Minimum Distances) ---
    else if (implementation === 'micd') {
        let totalMinDeltaE1 = 0;
        const palette1To2 = colors1.map(color1 => {
            let minDeltaE = Infinity;
            let closestColor2 = null;
            for (const color2 of colors2) {
              const result = getDeltaE(color1, color2);
              if (result === null) {
                console.error("Stopping comparison logic because deltaE is null.");
                return null;
              }
              if (result < minDeltaE) {
                  minDeltaE = result;
                  closestColor2 = color2;
              }
            }
            if (minDeltaE !== Infinity) { totalMinDeltaE1 += minDeltaE; }
            return { color: color1, closestInOtherPalette: closestColor2, difference: minDeltaE };
        });

        let totalMinDeltaE2 = 0;
        const palette2To1 = colors2.map(color2 => {
            let minDeltaE = Infinity;
            let closestColor1 = null;
            for (const color1 of colors1) {
                const result = getDeltaE(color2, color1); 
                if (result === null) {
                  console.error("Stopping comparison logic because deltaE is null.");
                  return null;
                }
                if (result < minDeltaE) {
                    minDeltaE = result;
                    closestColor1 = color1;
                }
            }
            if (minDeltaE !== Infinity) { totalMinDeltaE2 += minDeltaE; }
            return { color: color2, closestInOtherPalette: closestColor1, difference: minDeltaE };
        });

        // Average minimum Delta E for each palette
        const avgMinDeltaE1 = numColors1 > 0 ? totalMinDeltaE1 / numColors1 : Infinity;
        const avgMinDeltaE2 = numColors2 > 0 ? totalMinDeltaE2 / numColors2 : Infinity;

        // MICD is the average of the two directional averages
        const micd = (avgMinDeltaE1 + avgMinDeltaE2) / 2;

        return {
            score: micd,
            palette1To2: palette1To2,
            palette2To1: palette2To1,
            totalCost1: totalMinDeltaE1,
            totalCost2: totalMinDeltaE2,
        } as MappingResult;
    }

    // --- 4. Weighted MICD (Weighted Mean of Minimum Distances) ---
    else if (implementation === 'weighted_micd') {
        let weightedTotalDeltaE1 = 0;
        let totalWeight1 = 0;
        const palette1To2 = colors1.map(color1 => {
            let minDeltaE = Infinity;
            let closestColor2 = null;
            for (const color2 of colors2) {
                const result = getDeltaE(color1, color2);
                if (result === null) {
                  console.error("Stopping comparison logic because deltaE is null.");
                  return null;
                }
                if (result < minDeltaE) {
                    minDeltaE = result;
                    closestColor2 = color2;
                }
            }
            if (minDeltaE !== Infinity) {
                weightedTotalDeltaE1 += minDeltaE * color1.proportion;
                totalWeight1 += color1.proportion;
            }
            return { color: color1, closestInOtherPalette: closestColor2, difference: minDeltaE, weight: color1.proportion };
        });

        let weightedTotalDeltaE2 = 0;
        let totalWeight2 = 0;
        const palette2To1 = colors2.map(color2 => {
            let minDeltaE = Infinity;
            let closestColor1 = null;
            for (const color1 of colors1) {
                const result = getDeltaE(color2, color1); 
                if (result === null) {
                  console.error("Stopping comparison logic because deltaE is null.");
                  return null;
                }
                if (result < minDeltaE) {
                    minDeltaE = result;
                    closestColor1 = color1;
                }
            }
            if (minDeltaE !== Infinity) {
                weightedTotalDeltaE2 += minDeltaE * color2.proportion;
                totalWeight2 += color2.proportion;
            }
            return { color: color2, closestInOtherPalette: closestColor1, difference: minDeltaE, weight: color2.proportion };
        });

        // Weighted Average minimum Delta E for each palette
        // Note: totalWeightX should equal totalPixelsX if all colors are valid.
        const weightedAvgMinDeltaE1 = totalWeight1 > 0 ? weightedTotalDeltaE1 / totalWeight1 : Infinity;
        const weightedAvgMinDeltaE2 = totalWeight2 > 0 ? weightedTotalDeltaE2 / totalWeight2 : Infinity;

        // Weighted MICD is the average of the two directional weighted averages
        const micd = (weightedAvgMinDeltaE1 + weightedAvgMinDeltaE2) / 2;

        return {
            score: micd,
            palette1To2: palette1To2,
            palette2To1: palette2To1,
            totalCost1: weightedTotalDeltaE1, // Total weighted cost
            totalCost2: weightedTotalDeltaE2, // Total weighted cost
        } as MappingResult;
    }
    
    // Fallback for unknown implementation type
    console.error(`Unknown implementation method: ${implementation}`);
    return null;
  }, [implementation]);

  const findMostSimilarMovie = useCallback(async () => {
    if (!selectedMovieId) {
      setTopRecommendations([]);
      setRecommendationError(null);
      return;
    }
    setIsLoadingRecommendation(true);
    setRecommendationError(null); 
    setTopRecommendations([]); 
    setDetailedMICDExplanation(null);

    try {
      const candidateMovies = allMovies.filter(movie => movie.id !== selectedMovieId);
      
      // Initialize the concurrency limiter: Only allow 5 fetches at once.
      const limit = pLimit(100); 

      // ----------------------------------------------------
      // PHASE 1: I/O Parallelization (Fetch ALL data with CONCURRENCY LIMIT)
      // ----------------------------------------------------
      
      // 1. Fetch the selected movie's colors first (we need this quickly to start comparing)
      const selectedMovieColors = fetchPaletteColors(selectedMovieId);

      if (!selectedMovieColors || selectedMovieColors.length === 0) {
        setRecommendationError('Could not fetch palette colors for the selected movie.');
        return;
      }

      // 2. Prepare promises for all candidates, wrapped by the concurrency limiter
      const similarityPromises = candidateMovies
        .map(candidateMovie => {
          // Wrap the async task in 'limit' to control when it runs.
          return limit(async () => {
            // Fetch colors for the candidate movie
            const candidateColors = fetchPaletteColors(candidateMovie.id);
            
            if (!candidateColors || candidateColors.length === 0) {
              return null; // Skip if no colors
            }
            const mapping = calculateSimilarity(selectedMovieColors, candidateColors) as MappingResult;
            
            // Calculate similarity synchronously *after* the fetch is complete
            return {
              movie: candidateMovie,
              mapping: mapping,
              score: mapping.score // needs to be directly accessible to JSX
            } as RecommendationResult;
          });
        });

      // 3. Wait for all batches of limited-concurrency promises to resolve
      const similarityScores = await Promise.all(similarityPromises);

      // ----------------------------------------------------
      // PHASE 2 & 3: Filter, Sort, and Process Results
      // ----------------------------------------------------
    
      similarityScores.sort((a: any, b: any) => a.score - b.score);
      const topThreeRecommendations = similarityScores.slice(0, 3) as RecommendationResult[];
      setTopRecommendations(topThreeRecommendations as RecommendationResult[]); 

      if (topThreeRecommendations.length > 0) {
          setDetailedMICDExplanation(topThreeRecommendations[0].mapping);
      } else {
          setRecommendationError('No similar palette found.');
      }
    } catch (error) {
      console.error("Error finding similar movie:", error);
      setRecommendationError('An error occurred while finding a recommendation.');
    } finally {
      setIsLoadingRecommendation(false);
    }
  }, [selectedMovieId, fetchPaletteColors, calculateSimilarity, allMovies]);

  const fetchColorExplanation = useCallback(async (color: string) => {
    if (!selectedMovieId || !selectedMovieData || !color) {
      console.error("ERROR: color is ${color} so no explanation will be fetched")
      return;
    }
    setIsLoadingExplanation(true);
    try {
      const explanationResult = await explainColorPalette({ movieId: selectedMovieId, color, movieName: selectedMovieData.name });
      if (explanationResult.success && explanationResult.explanation) {
        setColorExplanation(explanationResult.explanation);
        setExplanationError(null);
      } else {
        setExplanationError(explanationResult.error || `Failed to get explanation for ${color}.`);
      }
    } catch (aiError: any) {
      setExplanationError(`An error occurred getting explanation for ${color}: ${aiError.message}`);
    } finally {
      setIsLoadingExplanation(false);
    }
    setIsLoadingExplanation(false); // Reset all loading states after the loop
  }, [selectedMovieId, colorExplanation, isLoadingExplanation, selectedMovieData]);


  const handlePaletteImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    if (selectedMovieData && selectedMoviePalettePath) {
      console.error('Error loading palette image:', selectedMoviePalettePath, e);
      setPaletteImageError(true);
      setError(`Failed to load palette image: ${selectedMoviePalettePath}. Check if the file exists in the public/palettes folder.`);
    } else {
      console.error('Error loading palette image, but selectedMovieData or palettePath is missing:', e);
      setPaletteImageError(true);
      setError('Failed to load palette image. Movie data might be incomplete.');
    }
  };


  // Handle clicks on the color palette image
  const handlePaletteClick = async (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    if (!selectedMoviePalettePath || paletteImageError) return; // Don't process clicks if image failed to load
    const img = paletteImageRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) {
      console.warn("Palette image not ready for interaction.");
      return; // Image might not be fully loaded or has zero dimensions
    }
    const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Basic boundary check
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
      console.log("Click outside image bounds");
      return;
    }

    const colorHex = getColorAtPixel(img, x, y);
     if (colorHex === '#000000') {
      console.warn("Clicked on black/error area or failed to get color.");
      return;
     }

    const hsv = hexToHsv(colorHex);
      console.log(`Clicked color: ${colorHex}, HSV:`, hsv);

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

    let foundColor: string | null = null;

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

    // Check the color in the map
    for (const colorName in hsvToColorMap) {
      const rangeGroups = hsvToColorMap[colorName];
      let colorMatch = false;

      for (const rangeGroup of rangeGroups) {
        // Ensure the rangeGroup is a valid pair of min/max HSV arrays
        if (rangeGroup && rangeGroup.length === 2 && rangeGroup[0].length === 3 && rangeGroup[1].length === 3) {
          if (isWithinRange(hsv, rangeGroup)) {
            colorMatch = true;
            break; // Found a match within this color's ranges
          }
        } else {
          console.warn(`Invalid range format for color ${colorName}:`, rangeGroup);
        }
      }

      if (colorMatch) {
        foundColor = colorName;
        break; // Found the color, stop checking other colors
      }
    }

    if (foundColor) {
      console.log(`Mapped click to color: ${foundColor}`);
      setSelectedColor(foundColor);
      
      // Reset pagination state for the new color, starting at Page 0
      setPaginatedFrames([]);
      setCurrentFramePage(0);
      setHasMoreFrames(false);
      setIsLoadingMoreFrames(true); // Set initial loading state for the frames
      setError(null);
      
      // Clear AI explanation state, which will show a loading indicator for the AI text
      setColorExplanation(''); 

      // Define the two asynchronous operations which will run concurrently
      const framesPromise = getColorFrameFoldersPaginated({
          movieId: selectedMovieId,
          color: foundColor,
          page: 0, // Corrected back to 0 for slice(page * pageSize) logic
          pageSize: FRAME_PAGE_SIZE,
      }) as Promise<GetColorFrameFoldersPaginationOutput>; // Cast the Promise type
      const explanationPromise = fetchColorExplanation(foundColor);

      // 3. Start Explanation in the background (FIRE-AND-FORGET)
      // This will update the text state when it's done, non-blocking.
      (async () => {
          try {
              const explanationResult = await explanationPromise;
          } catch (e: any) {
              console.error("Failed to load explanation:", e);
              // Do not set global error; let the main block handle critical errors
          }
      })();
      
      try {
        // 4. Await and update state for the Frames (FASTEST)
        const framesResult = await framesPromise;

        // 5. Handle the frames result
        if (framesResult.error) {
          throw new Error(framesResult.error);
        }
        
        setPaginatedFrames(framesResult.frames);
        setHasMoreFrames(framesResult.hasMore);

      } catch (e: any) {
        // Catch any error from the frames promise (critical failure)
        console.error("Failed to load frames:", e);
        setError("Could not load frames for this color. Please try again.");
        setHasMoreFrames(false);
      } finally {
        // Turn off frame specific loading indicator
        setIsLoadingMoreFrames(false);
      }
    } else if (foundColor) {
      console.log(`Mapped click to color ${foundColor}, but no corresponding frame folder exists.`);
    } else {
      console.log(`Could not map clicked color ${colorHex} (HSV: ${hsv.h},${hsv.s},${hsv.v}) to a known frame color category.`);
    }
  };

  // Handle errors when loading frame images
  const handleFrameImageError = (color: string, frameFile: string) => {
    console.error(`Error loading frame image: /frames/${selectedMovieId}/${color}/${frameFile}`);
    setFrameErrors(prev => ({
    ...prev,
    [color]: {
        ...(prev[color] || {}),
        [frameFile]: true // Mark this specific frame as having an error
    }
    }));
  };

  // Handle clicks on frame images to open the frame modal
  const handleFrameClick = async (frameFile: string) => {
    if (!selectedMovieId || !selectedColor) return;

    const framePath = `/frames/${selectedMovieId}/${selectedColor}/${frameFile}`;
    setSelectedFramePath(framePath); // Set the path for the main enlarged frame

    // Reset trailer image path initially
    setTrailerImagePath(null);

    try {
      // Extract the base filename without extension
      const baseFilename = frameFile.substring(0, frameFile.lastIndexOf('.')) || frameFile;
      const possibleExtensions = ['png', 'jpg', 'jpeg'];
      let foundTrailer = false;

      for (const ext of possibleExtensions) {
        const trailerFilename = `${baseFilename}.${ext}`;
        const response = await fetch(`/api/trailer-file?movieId=${selectedMovieId}&frameFile=${trailerFilename}`);

        if (response.ok) {
          const data: TrailerFileApiOutput = await response.json();
          if (data.success && data.trailer && data.trailer !== '') {
            console.log("Trailer image found:", data.trailer);
            setTrailerImagePath(data.trailer);
            foundTrailer = true;
            break; // Exit loop once a trailer is found
          }
        }
      }
      if (!foundTrailer) {
        console.log(`No corresponding trailer file found for frame: ${frameFile}`);
      }
    } catch (error) {
      console.error("Error calling trailer API:", error);
    }
    setIsFrameModalOpen(true); // Open the modal
  };

  const handleMovieTitleClick = (movieName: string) => {
    const movie = allMovies.find(m => m.name === movieName);
    if (movie) {
      setInputValue(movie.id); // Set input value to the ID for consistency
      setSelectedMovieId(movie.id); // Trigger movie load
      setIsBrowsing(false); // Close browse dialog
      setIsOpen(false); // Ensure dialog is closed
    } else {
      setError(`Could not find data for movie: ${movieName}`);
    }
  };

  const handleBackToHomePage = () => {
    setSelectedMovieId('');
    setSelectedMovieData(null);
    setSelectedMoviePalettePath(null);
    setInputValue('');
    setError(null);
    setIsMovieSelected(false);
    setSelectedColor(null);
    setPaletteImageError(false);
    setMoodColor('');
    setMoodMovies({});
    setIsLoadingMoodSearch(false);
    setNoMoodResults(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) { // Show the button after scrolling 200px down
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extract unique genres from allMovies
  const uniqueGenres = Array.from(new Set(allMovies.flatMap(movie => movie.genres || []))).sort();

  // Predefined list of colors for mood search
  const moodColors = ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Blue', 'Purple', 'Pink'];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMoodSearch = async () => {
    if (!moodColor || moodColor === 'All') {
      setError("Please select a color for the mood search.");
      setMoodMovies({});
      setNoMoodResults(false);
      return;
    }
    setIsLoadingMoodSearch(true);
    setMoodMovies({});
    setNoMoodResults(false);
    setError(null);
    try {
      const moodMoviesResult = await findMoviesByMood(moodColor);
      const hasResults = moodMoviesResult && Object.values(moodMoviesResult).some(movies => movies.length > 0);
      if (hasResults) {
        setMoodMovies(moodMoviesResult);
      } else {
        setNoMoodResults(true);
      }
    } catch (err: any) {
      console.error("Error during mood search:", err);
      setError(`An error occurred during the mood search: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoadingMoodSearch(false);
    }
  };
  
  // Function to get the top 3 movies from the mood search results
  const getTopMoodMovies = (moodMovies: Record<string, MovieColorPaletteData[]>) => {
    // Collect all movies from all genre lists
    const allMoodMoviesRaw = Object.values(moodMovies).flat();
    // Filter out duplicates based on movie ID
    const uniqueMoviesMap = new Map<string, MovieColorPaletteData>();
    allMoodMoviesRaw.forEach(movie => {
        uniqueMoviesMap.set(movie.id, movie);
    });
    const allMoodMovies = Array.from(uniqueMoviesMap.values());
    return allMoodMovies
      .sort((a, b) => b.colorProportion - a.colorProportion) // Sort by colorProportion descending
      .slice(0, 3); // Take the top 3
  };

  const topMoodMovies = getTopMoodMovies(moodMovies);

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center relative">
    {/* Header Card */}
       <Card className="w-full max-w-4xl shadow-xl bg-muted/80 mb-8 text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className=" p-4 border-b border-border">
          <Link href="/" onClick={handleBackToHomePage} className="block">
            <CardTitle className="text-4xl font-bold text-center text-primary font-jetbrains-mono cursor-pointer">RefinedPalette</CardTitle>
          </Link>
          <p className="text-center text-muted-foreground">Your mood. Your movie.</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Search Section Card */}
          {Object.keys(moodMovies).length === 0 && isLoadingMoodSearch === false && (
            <Card className="w-full shadow-md border border-border rounded-lg ">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xl font-semibold text-center text-foreground">Search Movie Palettes</CardTitle>
                <CardDescription className="text-center text-muted-foreground text-sm">Enter a movie's IMDb ID or name to find its visual palette.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const trimmedInput = inputValue.trim();
                        if (!trimmedInput) {
                            setError("Please enter a movie ID or name.");
                            return;
                        }

                        // Lookup MUST happen here for immediate validation/error feedback
                        const movieData = getMoviePaletteById(trimmedInput); 

                        if (movieData) {
                            // SUCCESS: Set the ID to trigger the decoupled useEffects
                            setSelectedMovieId(trimmedInput);
                        } else {
                            // FAILURE: Set error message and clear selection state
                            setError(`Movie "${trimmedInput}" not found in our data. Please check the ID or name and try again.`);
                            setSelectedMovieId('');
                        }
                    }} className="relative flex items-center gap-3 w-full" aria-label="Search for movie palette">
                  {/* Span for suggestion, positioned absolutely */}
                  <span
                    className="absolute inset-0 flex items-center pl-3 pointer-events-none text-gray-400 overflow-hidden text-nowrap"
                    style={{ top: 0, left: 0 }} // Explicitly set top and left
                    aria-hidden="true" // Hide from screen readers as it's a visual aid for the input
                  >
                    {/* Display suggestion only if inputValue exists and suggestion is longer */}
                    {inputValue && suggestion && suggestion.toLowerCase().startsWith(inputValue.trim().toLowerCase()) ? (
                      <span className="opacity-0">{inputValue}</span> // Hidden span to push suggestion
                    ) : null}
                    {inputValue && suggestion ? suggestion.substring(inputValue.length) : ''}
                  </span>
                  <Label htmlFor="movie-id-input" className="sr-only">Movie ID or Name:</Label>
                  {/* Input with transparent background and higher z-index */}
                  <Input
                    type="text"
                    id="movie-id-input" // Added id for label association
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value); // Keep inputValue as is
                      // Optionally clear error when user starts typing
                      if (error) setError(null);
                    }}
                    placeholder="Search"
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && suggestion) {
                        e.preventDefault();
                        setInputValue(suggestion);
                        const movie = allMovies.find(m => m.name.toLowerCase() === suggestion.toLowerCase());
                        if (movie && suggestion) { // Check if suggestion is not empty
                          setSelectedMovieId(movie.id);
                        } else {
                          // Handle case where suggestion doesn't match a movie (shouldn't happen if suggestion is based on allMovies)
                          console.error("Suggestion does not match a known movie:", suggestion);
                        }
                        setSuggestion(''); // Clear suggestion after accepting
                      }
                    }}
                    onInput={(e) => { // Use onInput for more immediate filtering
                      const value = (e.target as HTMLInputElement).value.trim().toLowerCase();
                      const matchingMovie = value ? allMovies.find(m => m.name.toLowerCase().startsWith(value)) : undefined; // Only search if value is not empty
                      if (matchingMovie && matchingMovie.name.toLowerCase() === value) {
                        setSuggestion(''); // If input exactly matches a movie name, no suggestion needed
                      } else
                        setSuggestion(matchingMovie ? matchingMovie.name : '');
                        if (error) setError(null); // Clear error on input
                    }
                  }
                  className="bg-transparent relative z-10 w-full px-3 py-2 pr-10"
                />
                <Button type="submit" aria-label="Load Movie Palette">
                  <Search className="mr-2 h-4 w-4" /> Load Palette
                </Button>
              </form>
            </CardContent>
            {/* Initial state message (not browsing) and Browse Button */}
            {!selectedMovieId && !isBrowsing && (
              <div className='w-full flex flex-col items-center p-4 pt-0'>
                <div className="text-center text-muted-foreground">
                  <p>Or, browse the list.</p>
                </div>
                <Button type="button" variant="outline" onClick={handleBrowseClick} aria-label="Browse movies" className="mt-2">Browse</Button>
              </div>
            )}
            </Card>
          )}
          {/* Movie List Dialog */}
          {isBrowsing && Object.keys(moodMovies).length === 0 && ( // Only show dialog when browsing and no mood movies are displayed
            <MovieListDialog isOpen={isBrowsing} onOpenChange={setIsBrowsing} movies={allMovies} handleMovieTitleClick={handleMovieTitleClick} />
          )}

          {/* Mood Search Section */}
          {!isBrowsing && !selectedMovieId && ( // Hide when browsing or movie is selected
            isLoadingMoodSearch ? (
              <div className="flex justify-center items-center p-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-4 text-xl text-muted-foreground">Finding movies for your mood...</span>
              </div>
            ) : (
            <Card className="w-full shadow-md mb-6 border border-border rounded-lg ">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xl font-semibold text-center text-foreground">Find Movies by Mood</CardTitle>
                <CardDescription className="text-center text-muted-foreground text-sm">Enter a genre and a color to find movies that match your mood.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <Label htmlFor="mood-color-select">Color:</Label>
                    <Select onValueChange={setMoodColor} value={moodColor}>
                      <SelectTrigger className="w-full" id="mood-color-select">
                        <SelectValue placeholder="Select a Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {moodColors.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleMoodSearch}>
                    Find Movies
                  </Button>
                </div>
                {noMoodResults && !isLoadingMoodSearch && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Movies Found</AlertTitle>
                    <AlertDescription>
                      We couldn't find any movies dominated by the color "{moodColor}". Please try a different color.
                    </AlertDescription>
                  </Alert>
                )}
                {Object.keys(moodMovies).length > 0 && topMoodMovies.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">Top matches for {moodColor} across all genres</h3>
                    <ol className="list-decimal list-inside space-y-3">
                      {topMoodMovies.map((movie, index) => (
                        <li key={movie.id} className="flex items-start">
                          <span className="mr-2 text-lg font-bold text-primary">{index + 1}.</span>
                          <Card
                            className="flex-grow bg-card border border-border rounded-lg shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200 flex items-center p-3"
                            onClick={() => setSelectedMovieId(movie.id)}
                          >
                            <div className="flex flex-grow items-center">
                              <span className="text-base font-semibold text-primary hover:underline mr-3">
                                {movie.name}
                              </span>
                              <p className="text-sm text-muted-foreground">{((movie as MovieColorPaletteData).colorProportion * 100).toFixed(2)}% match</p>
                            </div>
                             {/* Display the palette image */}
                              <Image
                                src={`/palettes/${movie.id}.png`}
                                alt={`Color palette for ${movie.name}`}
                                width={100} // Adjust width as needed
                                height={15} // Adjust height as needed
                                className="rounded border border-muted shadow-inner object-contain flex-shrink-0 ml-auto"
                              />
                          </Card>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {Object.keys(moodMovies).length > 0 && (
                  <div className="mt-8">
                  {Object.entries(moodMovies)
                  .sort(([genreA], [genreB]) => genreA.localeCompare(genreB)).map(([genre, movies]: [string, MovieColorPaletteData[]]) => (
                    movies.length > 0 && (
                      <div key={genre} className="mb-6">
                        <h3 className="text-xl font-semibold mb-3 text-foreground">{genre}</h3>
                        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4">
                          {movies.map(movie => (
                            <Card
                              key={movie.id}
                              // flex-shrink-0 prevents cards from shrinking below their content size
                              // w-64 gives each card a fixed width, forcing overflow
                              className="flex-shrink-0 w-64 bg-card border border-border rounded-lg shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200 h-auto flex flex-col"
                              style={{ height: 'auto' }} // Ensure card height adjusts to content
                              onClick={() => setSelectedMovieId(movie.id)}
                              >
                              {movie.posterUrl && (
                                <div className="relative w-full rounded-t-lg overflow-hidden border-b border-border" style={{ paddingBottom: '150%' }}> {/* Use padding-bottom to maintain aspect ratio, adjust value as needed */}
                                  <Image
                                    src={movie.posterUrl || ''} // Ensure src is not null
                                    alt={`${movie.name} poster`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 200px" // Adjust sizes based on card width and grid layout
                                  />
                                </div>
                              )}
                              <CardContent className="p-3 flex flex-col items-center text-center">
                                <span className="text-base font-semibold text-primary hover:underline">
                                  {movie.name}
                                </span>
                                <p className="text-sm text-muted-foreground mb-2">{((movie as MovieColorPaletteData).colorProportion * 100).toFixed(2)}% match</p> {/* Display proportion */}
                                {/* Display the palette image */}
                                <div className="w-full flex justify-center">
                                  <Image
                                    src={`/palettes/${movie.id}.png`}
                                    alt={`Color palette for ${movie.name}`}
                                    width={200} // Adjust width as needed
                                    height={20} // Adjust height as needed
                                    className="rounded border border-muted shadow-inner object-contain w-full max-w-[200px]"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {selectedMovieData ? (
            <>
            {/* Optional: Back Button if you want navigation-like behavior */}
            {isMovieSelected && (
              <Button variant="link" onClick={handleBackToHomePage} className='self-start mb-4' aria-label="Go back to search">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
              </Button>
            )}

            {/* Frame Preview Modal */}
            <Dialog open={isFrameModalOpen} onOpenChange={setIsFrameModalOpen}>
                <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] bg-card border border-border">
                  <DialogHeader>
                      <DialogTitle>Frame & Trailer Preview</DialogTitle>
                      <DialogDescription>
                        Selected frame from the movie ({selectedColor}) and its corresponding trailer shot (if available).
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Selected Frame Display */}
                    <div className="relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border">
                      {selectedFramePath ? (
                          <Image
                            key={`selected-${selectedFramePath}`} // Ensure re-render on change
                            src={selectedFramePath}
                            alt={`Selected Frame Preview`}
                            fill
                            className="object-contain" // Use contain to see the whole frame
                            sizes="(max-width: 768px) 100vw, 50vw"
                            onError={() => console.error(`Error loading selected frame: ${selectedFramePath}`)} // Basic error handling
                            priority // Prioritize loading the main frame in the modal
                          />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">No frame selected.</div>
                      )}
                    </div>

                    {/* Corresponding Trailer Image Display */}
                    <div className="relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border">
                        {trailerImagePath ? (
                          <Image
                            key={`trailer-${trailerImagePath}`} // Ensure re-render on change
                            src={trailerImagePath}
                            alt={`Corresponding Trailer Frame`}
                            fill
                            className="object-contain" // Use contain to see the whole frame
                            sizes="(max-width: 768px) 100vw, 50vw"
                            onError={() => console.warn(`Trailer image not found or failed to load: ${trailerImagePath}`)} // Warn instead of error
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            Corresponding trailer frame not available.
                          </div>
                        )}
                    </div>
                  </div>
                  <DialogFooter className="mt-4" >
                    <Button variant="outline" onClick={() => setIsFrameModalOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* YouTube Video Section */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              {/* Movie Poster Section */}
              {selectedMovieData.posterUrl && (
                <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4 aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-border">
                  <Image
                    src={selectedMovieData.posterUrl}
                    alt={`${selectedMovieData.name} Poster`}
                    width={300} // Adjust width as needed
                    height={450} // Maintain aspect ratio
                    className="object-cover w-full h-full"
                    priority // Prioritize loading the poster
                    onError={(e) => {
                      console.error('Error loading poster image:', selectedMovieData.posterUrl, e);
                      // Optionally hide the image or show a placeholder on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-grow w-full aspect-video rounded-lg overflow-hidden shadow-md bg-muted border border-border">
                {selectedMovieData.youtubeKey ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${selectedMovieData.youtubeKey}`}
                      title={`${selectedMovieData.name} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0" // Added border-0
                    />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-center">Youtube trailer not found for this movie</p>
                  </div>
                )}
              </div>
            </div>
              {/* Color Palette Section */}
               <Card className="mt-6  border border-border rounded-lg shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b border-border  flex flex-row items-center justify-between"> {/* Added flex properties */}
                  <div> {/* Wrap title and description */}
                    {/* <CardTitle className="text-xl font-semibold text-foreground">
                      {selectedColor ? `Frames for ${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}` : "Movie Frames by Color"}
                    </CardTitle> */}
                    <CardDescription className="text-muted-foreground text-sm">
                      {selectedColor ? `Showing frames where ${selectedColor} is dominant. Click a frame for details.` : "Select a dominant color category from the palette above."}
                    </CardDescription>
                  </div>
                    {selectedColor && ( // Only show the clear button when a color is selected
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedColor(null)}
                        aria-label="Clear color selection"
                        className="ml-2" // Add some margin to the left
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {selectedMoviePalettePath && !paletteImageError && (
                      <div className="mb-6 flex justify-center cursor-pointer" onClick={handlePaletteClick} title="Click to select a color category">
                        <Image
                          key={`palette-${selectedMovieId}`} // Add key for potential re-renders
                          src={selectedMoviePalettePath}
                          alt={`Visual color palette representation for ${selectedMovieData.name}`}
                          width={800} // Adjust width as needed
                          height={60} // Adjust height as needed
                          className="rounded border border-muted shadow-inner object-contain w-full max-w-lg" // Use object-contain
                          priority // Load palette image eagerly
                          ref={paletteImageRef}
                          onError={handlePaletteImageError}
                          // onClick is handled by the parent div now
                        />
                      </div>
                  )}
                  {/* === TOGGLE BUTTON AND DETAILS SECTION === */}
                  <div className="mt-8 pt-4 border-t border-gray-200">                      
                    <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-full text-white transition duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                          aria-expanded={showDetails}
                          aria-controls="palette-details"
                      >
                          {/* Icon that rotates when open */}
                          <svg 
                              className={`w-4 h-4 transition-transform duration-300 ${showDetails ? 'rotate-90' : 'rotate-0'}`} 
                              xmlns="http://www.w3.org/2000/svg" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                          >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
                      </button>
                      
                      {/* The conditionally rendered detail section */}
                      {showDetails && (
                        <div id="palette-details" className="mt-4 p-4 rounded-lg bg-card text-sm text-white border border-gray-200">
                          <PaletteVisualizer 
                              palette={paletteService.getPaletteByTconst(selectedMovieId)}
                          />
                        </div>
                      )}
                  </div>
                  {paletteImageError && (
                    <div className="mb-6 flex justify-center items-center p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-md text-sm">
                      <AlertCircle className="h-5 w-5 mr-2"/>
                      Could not load the color palette image.
                    </div>
                  )}
                  {/* Frames by Color Section */}
                  <Card className="mt-6  border border-border rounded-lg shadow-sm overflow-hidden">
                    <CardHeader className="p-4 border-b border-border ">
                      <CardTitle className="text-xl font-semibold text-center text-foreground">
                        {selectedColor ? `Frames for ${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}` : 'Movie Frames by Color'}
                      </CardTitle>
                      {/* <CardDescription className="text-center text-muted-foreground text-sm">
                        {selectedColor ? `Showing frames where ${selectedColor} is dominant. Click a frame for details.` : 'Select a dominant color category from the palette above.'}
                      </CardDescription> */}
                    </CardHeader>
                      <CardContent className="p-4 md:p-6">
                          {!selectedColor ? (
                                <p className="text-center text-muted-foreground p-6">Click on the color palette above to see corresponding frames.</p>
                          ) : (
                              // Explanation Section
                              <div className="mb-6">
                                {isLoadingExplanation ? (
                                  <div className="flex items-center text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Loading AI-generated color use explanation...
                                  </div>
                                ) : explanationError ? (
                                  <div className="flex items-center text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Error loading explanation: {explanationError}
                                  </div>
                                ) : colorExplanation ? (
                                  <ReactMarkdown 
                                    // className="prose prose-sm dark:prose-invert text-muted-foreground"
                                    remarkPlugins={[remarkGfm]}>
                                    {colorExplanation}
                                  </ReactMarkdown>
                                ) : null}
                              </div>
                              )
                          }
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                              {(selectedColor !== null && paginatedFrames && paginatedFrames.length > 0) ? (
                                  [...(selectedColor !== null && paginatedFrames) ? paginatedFrames : []].sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })).map((file) => {
                                    if(!selectedMovieId || !selectedColor) return null;
                                    const framePath = `/frames/${selectedMovieId}/${selectedColor}/${file.fileName}`;
                                    const hasError = (frameErrors[selectedColor] || {})?.[file.fileName] ?? false;
                                    return (
                                      <div
                                        key={file.fileName}
                                        className={cn(
                                            "relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border group transition-opacity",
                                            hasError ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:opacity-90'
                                        )}
                                        onClick={() => !hasError && handleFrameClick(file.fileName)}
                                        role="button"
                                        tabIndex={hasError ? -1 : 0} // Make it focusable only if not error
                                        aria-label={hasError ? `Frame ${file.fileName} failed to load` : `View frame ${file.fileName}`}
                                        onKeyDown={(e) => { if (!hasError && (e.key === 'Enter' || e.key === ' ')) { handleFrameClick(file.fileName); }}} // Keyboard accessibility
                                      >
                                        {!hasError ? (
                                          <Image
                                              src={framePath}
                                              alt={`Frame ${file.fileName} highlighting color ${selectedColor} from ${selectedMovieData.name}`}
                                              fill // Use fill for responsive images
                                              className="object-cover transition-transform duration-200 group-hover:scale-105" // Subtle hover effect
                                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" // Optimize image loading
                                              onError={() => handleFrameImageError(selectedColor, file.fileName)}
                                              loading="lazy" // Lazy load frame images
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full bg-destructive/10 p-2 text-center">
                                              <AlertCircle className="h-6 w-6 text-destructive mb-1" />
                                              <span className="text-xs text-destructive">Load Error</span>
                                            </div>
                                        )}
                                      </div>
                                    );
                                  })
                              ) : (
                                  <div className="col-span-full text-center text-muted-foreground p-6">
                                      {/* No representative frames found for the color {selectedColor}. */}
                                  </div>
                              )}
                          </div>
                          {/* Load More Frames Button - Added here */}
                          {hasMoreFrames && (
                              <div className="flex justify-center mt-6">
                                  <Button
                                      onClick={loadMoreFrames}
                                      disabled={isLoadingMoreFrames}
                                      variant="outline"
                                      className="w-full sm:w-1/2"
                                  >
                                      {/* Show spinner when loading */}
                                      {isLoadingMoreFrames ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : null}
                                      Load More Frames
                                  </Button>
                              </div>
                          )}
                      </CardContent>
                  </Card>
                  {/* Movie Recommendation Section */}
                  <div className="mt-6 text-center text-lg text-foreground font-semibold">
                    {isLoadingRecommendation ? (
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary"/>
                            Finding recommendations...
                        </div>
                    ) : recommendationError ? (
                        <p className="text-sm text-destructive">{recommendationError}</p>
                    ) : topRecommendations && topRecommendations.length > 0 ? (
                      <>
                        If you liked this palette, you might also like:{' '}
                        <span
                          className="text-lg font-semibold text-primary hover:underline cursor-pointer"
                          onClick={() => setSelectedMovieId(topRecommendations[0].movie.id)}
                        >
                          {topRecommendations[0].movie.name}
                        </span>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {topRecommendations.map((recommendation, index) => (
                            <Card key={recommendation.movie.id} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                              <CardContent className="p-3 flex flex-col items-center text-center ">
                              <div className="text-4xl font-bold text-primary mb-2">{index + 1}</div> {/* Big number */}
                                {recommendation.movie.youtubeKey && (
                                    <div className="relative w-full aspect-video mb-2 rounded overflow-hidden border border-muted">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${recommendation.movie.youtubeKey}`}
                                      className="object-cover"
                                      width="100%"
                                      height="100%"
                                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; web-share"
                                    />
                                    </div>
                                  )}
                                  <span
                                      className="text-base font-semibold text-primary hover:underline cursor-pointer"
                                      onClick={() => setSelectedMovieId(recommendation.movie.id)}
                                    >
                                      {recommendation.movie.name}
                                  </span>
                                  <p className="text-sm text-muted-foreground">Similarity score: {recommendation.score.toFixed(2)}</p>
                                  {`/palettes/${recommendation.movie.id}.png` && (
                                    <div className="mt-2 w-full flex justify-center">
                                      <Image
                                        src={`/palettes/${recommendation.movie.id}.png`}
                                        alt={`Color palette for ${recommendation.movie.name}`}
                                        width={200} // Adjust width as needed
                                        height={20} // Adjust height as needed
                                        className="rounded border border-muted shadow-inner object-contain w-full max-w-xs"
                                      />
                                    </div>
                                  )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    ) : null
                    }
                    {selectedMovieData && topRecommendations && topRecommendations.length > 0 && detailedMICDExplanation && (
                    // Check if the result is the detailed object before setting state
                    <RecommendationExplanationPanel
                      selectedMovieName={selectedMovieData.name}
                      recommendedMovieName={topRecommendations[0].movie.name}
                      recommendedMovieMICD={topRecommendations[0].score}
                      explanationDetails={detailedMICDExplanation}
                    />
                    )}
                  </div> {/* End of Movie Recommendation Section */}
                </CardContent>
                
              </Card>
              
            </>
          ) : null // Render nothing if error exists or browsing (components handle those states)
          }
          {/* Back to Top button */}
          {showBackToTop && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="fixed bottom-4 right-4 z-50"
                    variant="outline"
                    size="icon"
                    onClick={scrollToTop}
                    aria-label="Back to top of the page"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Back to top</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
const allMovies: MovieMetadata[] = getAllMoviePalettes()
 .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name
const paletteService = new PaletteService(); 