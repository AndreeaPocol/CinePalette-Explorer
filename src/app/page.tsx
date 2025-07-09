'use client';

import munkres from 'munkres';
import Color from 'colorjs.io';
import path from 'path';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import type { ReactElement, SyntheticEvent, ReactNode } from 'react';
import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMoviePaletteById, getAllMoviePalettes, type MoviePaletteData } from '@/data/movie-palettes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Loader2, Search, Image as ImageIcon, AlertCircle, X, ArrowLeft, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { getColorFrameFolders, type GetColorFrameFoldersOutput } from '@/actions/get-color-frames';
import { getColorAtPixel, hexToHsv } from '@/lib/color-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FrameFilesApiOutput } from '@/app/api/frame-files/route';
import type { TrailerFileApiOutput } from '@/app/api/trailer-file/route';
import Link from "next/link";
import { findMoviesByMood } from '@/movie-mood-finder';
import { MovieListDialog } from "@/components/movie-list-dialog";
import RecommendationExplanationPanel from "@/components/recommendation-explanation-panel";
import type { MoviePaletteDataWithColorCount } from '@/movie-mood-finder';


type MoviePaletteDataWithId = MoviePaletteData & { id: string };
type FrameFiles = Record<string, string[]>; // Stores filenames for each color


export default function CinePaletteExplorer(): ReactElement {
  const [isFrameModalOpen, setIsFrameModalOpen] = useState<boolean>(false); // State to control the visibility of the frame modal
  const [isOpen, setIsOpen] = useState<boolean>(false); // State to control the visibility of the movie list dialog
  const [suggestion, setSuggestion] = useState<string>(''); // State for the search input suggestion
  const [inputValue, setInputValue] = useState<string>(''); // State to hold the user's input for movie ID or name
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false); // State to indicate if the user is browsing movies
  const [isMovieSelected, setIsMovieSelected] = useState<boolean>(false); // State to indicate if a movie is selected

  const [selectedMovieId, setSelectedMovieId] = useState<string>(''); // State to store the selected movie's ID
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null); // State to store the data of the selected movie
  const [selectedMoviePalettePath, setSelectedMoviePalettePath] = useState<string | null>(null); // State to store the palette path of the selected movie
  const paletteImageRef = useRef<HTMLImageElement>(null); // Ref to the palette image element
  const [error, setError] = useState<string | null>(null); // State to store error messages
  const [colorFolders, setColorFolders] = useState<string[]>([]); // State to store the list of color folders for the selected movie

  const [selectedFramePath, setSelectedFramePath] = useState<string | null>(null); // State to store the path of the selected frame for display in the modal
  const [trailerImagePath, setTrailerImagePath] = useState<string | null>(null); // State to store the path of the trailer image for display in the modal
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false); // State to track loading status of color folders

  const [selectedColor, setSelectedColor] = useState<string | null>(null); // State to store the currently selected color folder
  const [paletteImageError, setPaletteImageError] = useState<boolean>(false); // State to track if there's an error loading the palette image
  const [frameErrors, setFrameErrors] = useState<Record<string, Record<string, boolean>>>({}); // State to track loading errors for each frame
  const [frameFiles, setFrameFiles] = useState<FrameFiles>({}); // State to store the filenames of frames for each color
  const [isLoadingFrameFiles, setIsLoadingFrameFiles] = useState<Record<string, boolean>>({}); // State to track loading status of frames for each color
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [topRecommendations, setTopRecommendations] = useState<{ movie: MoviePaletteDataWithId, micd: number }[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState<boolean>(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [micdValue, setMicdValue] = useState<number | null>(null);

  const [moodColor, setMoodColor] = useState<string>('');
  const [moodMovies, setMoodMovies] = useState<Record<string, MoviePaletteDataWithColorCount[]>>({});
  const [isLoadingMoodSearch, setIsLoadingMoodSearch] = useState<boolean>(false);
  const [implementation, setImplementation] = useState<'hungarian' | 'micd'>('micd'); // State for implementation method

  // Define the desired order of colors for display
  const colorOrder = [
    'red',
    'orange',
    'yellow',
    'green',
    'cyan',
    'blue',
    'purple',
    'pink',
    'trailer'
  ];

  // Fetch movie details when the selected movie ID changes
  useEffect(() => {
      if (selectedMovieId === '') return;
      if (selectedMovieId) {
        const movieData = getMoviePaletteById(selectedMovieId);
        if (movieData) {
          setSelectedMovieData(movieData);
          setSelectedMoviePalettePath(path.join(process.cwd(), 'palettes', `${movieData.id}.png`));
          setIsMovieSelected(true);
          setError(null);
          setPaletteImageError(false);
          setFrameErrors({});
          setFrameFiles({});
          setIsLoadingFrameFiles({});

          const fetchFolders = async () => {
            setIsLoadingFolders(true);
            setColorFolders([]);
            try {
              const result: GetColorFrameFoldersOutput = await getColorFrameFolders({ movieId: selectedMovieId });
              if (result.success && result.data) {
                // Sort the received colors based on the defined order, default to original if not in list.
                const sortedColors = result.data.sort((a, b) => {
                    return colorOrder.indexOf(a) - colorOrder.indexOf(b);
                });
                setColorFolders(sortedColors);
                if (result.data.length === 0) {
                  console.log(`No frame folders found for ${selectedMovieId}.`);
                }
                // Initialize frameFiles structure
                const initialFrameFiles: FrameFiles = {};
                result.data.forEach(color => initialFrameFiles[color] = []);
                setFrameFiles(initialFrameFiles);
              } else {
                console.error("Error fetching color folders:", result.error);
                setError(result.error || 'Failed to load frame data.');
              }
            } catch (fetchError) {
              console.error("Exception fetching color folders:", fetchError);
              setError('An error occurred while fetching frame data.');
            } finally {
              setIsLoadingFolders(false);
            }
          };
          fetchFolders();
        } 
        else {
          setSelectedMovieData(null);
          setSelectedMoviePalettePath(null);
          setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
          setIsMovieSelected(false);
          setColorFolders([]);
          setPaletteImageError(false);
          setFrameErrors({});
          setFrameFiles({});
          setIsLoadingFrameFiles({});
        }
      } else {
        setSelectedMovieData(null);
        setSelectedMoviePalettePath(null);
        setColorFolders([]);
        setPaletteImageError(false);
        setFrameErrors({});
        setIsMovieSelected(false);
        setFrameFiles({});
        setIsLoadingFrameFiles({});
        setSelectedColor(null); // Reset selected color when movie ID is cleared
    }
  }, [selectedMovieId]);

  // Fetch frame filenames when a color is selected
  useEffect(() => {
    if (selectedColor && selectedMovieId && !frameFiles[selectedColor]?.length && !isLoadingFrameFiles[selectedColor]) {
      const fetchFilesForColor = async () => {
        setIsLoadingFrameFiles(prev => ({ ...prev, [selectedColor]: true }));
        try {
          const response = await fetch(`/api/frame-files?movieId=${selectedMovieId}&color=${selectedColor}`);
          const data: FrameFilesApiOutput = await response.json();
          if (data.success && data.files) {
            setFrameFiles(prev => ({ ...prev, [selectedColor]: data.files ?? [] }));
            // Initialize error state for the new frames
            const newErrors: Record<string, boolean> = {};
            (data.files ?? []).forEach(file => newErrors[file] = false);
            setFrameErrors(prev => ({...prev, [selectedColor]: newErrors }));
          } else {
            console.error(`Error fetching files for color ${selectedColor}:`, data.error);
            // Optionally set an error state for this color
          }
        } catch (err) {
          console.error(`Exception fetching files for color ${selectedColor}:`, err);
          // Optionally set an error state for this color
        } finally {
          setIsLoadingFrameFiles(prev => ({ ...prev, [selectedColor]: false }));
        }
      };
      fetchFilesForColor();
    }
  }, [selectedColor, selectedMovieId, frameFiles, isLoadingFrameFiles]);

  const handleMovieSelect = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    // If a movie is already selected, don't re-process unless input has changed
    // if (isMovieSelected && selectedMovieId === inputValue.trim().toLowerCase()) return;
    const trimmedInput = inputValue.trim(); // Trim whitespace from the input value

    if (!trimmedInput) {
      setError("Please enter a movie ID or name.");
      return;
    }

    const movieData = getMoviePaletteById(trimmedInput); // getMoviePaletteById handles both ID and name

    if (movieData) {
      // Reset states before setting new movie ID to trigger effects correctly
      setSelectedMovieId('');
      setSelectedMovieData(null);
      setSelectedMoviePalettePath(null);
      setColorFolders([]);
      setFrameFiles({});
      setFrameErrors({});
      setIsLoadingFrameFiles({});
      setSelectedColor(null);
      setPaletteImageError(false);
      setError(null);

      // Set the new movie ID after a short delay to ensure state reset is processed
      // This might not be strictly necessary but can help in complex state scenarios
      setTimeout(() => {
        setSelectedMovieId(movieData.id);
      }, 0);
    } else {
      setError(`Movie "${trimmedInput}" not found in our data. Please check the ID or name and try again.`);
      // Clear previous movie data if movie not found
      setSelectedMovieId('');
      setSelectedMovieData(null);
      setSelectedMoviePalettePath(null);
      setIsMovieSelected(false);
      setColorFolders([]);
      setFrameFiles({});
      setFrameErrors({});
      setIsLoadingFrameFiles({});
      setSelectedColor(null);
      setPaletteImageError(false);
    }
  };

  const handleBrowseClick = () => {
    setIsBrowsing(true);
    setError(null);
  };

  const fetchPaletteColors = useCallback(async (movieId: string) => {
    try {
      const response = await fetch(`/api/palette-colors?movieId=${movieId}`);
      if (!response.ok) {
        throw new Error(`Error fetching palette colors: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && data.colors) {
        return data.colors as { r: number; g: number; b: number, count: number }[];
      } else {
        throw new Error(data.error || 'Failed to fetch palette colors');
      }
    } catch (error) {
      return null;
    }
  }, []);

  // Calculate Mean Inter-color Distance (MICD) between two palettes
  const calculateMICD = useCallback((colors1: { r: number; g: number; b: number, count: number }[], colors2: { r: number; g: number; b: number, count: number }[]): number | {
    micd: number, 
    palette1To2: any[],
    palette2To1: any[],
    totalPixels1: number,
    totalPixels2: number,
    totalCost1: number,
    totalCost2: number,
  } | { micd: number } => {
    const numColors1 = colors1.length;
    const numColors2 = colors2.length;
    if (!numColors1 || !numColors2) return Infinity;

    const totalPixels1 = colors1.reduce((sum, color) => sum + color.count, 0);
    const totalPixels2 = colors2.reduce((sum, color) => sum + color.count, 0);

    if (implementation === 'hungarian') {
      // Use the Hungarian algorithm to find the minimum weight perfect matching
      // Create the cost matrix based on Delta E values
      // Determine the dimensions of the cost matrix
      const size = Math.max(numColors1, numColors2);
      // Initialize costMatrix with padding (Infinity) for potential extra rows
      const costMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));

      // Fill in the actual Delta E values
      for (let i = 0; i < numColors1; i++) { // Iterate up to the actual number of colors in palette 1
        for (let j = 0; j < numColors2; j++) {
          const color1 = colors1[i];
          const color2 = colors2[j];

          // Ensure color objects are created within the loop
          const color1Obj = new Color("srgb", [color1.r / 255, color1.g / 255, color1.b / 255]).to("lab");
          const color2Obj = new Color("srgb", [color2.r / 255, color2.g / 255, color2.b / 255]).to("lab");

          const deltaE = color1Obj.deltaE2000(color2Obj);

          if (deltaE !== undefined && !isNaN(deltaE)) {
            costMatrix[i][j] = deltaE;
          } else {
            // Keep as Infinity if calculation fails
            console.warn(`Delta E calculation failed for colors: ${JSON.stringify(color1)} and ${JSON.stringify(color2)}`);
          }
        }
      }

      const result = munkres(costMatrix); // Pass the cost matrix to the execute method

      // The result is an array of [row, col] pairs representing the optimal assignment
      const matchedPairs: { color1Index: number; color2Index: number; deltaE: number }[] = result
        .filter((pair: [number, number]) => pair[0] < numColors1 && pair[1] < numColors2) // Filter out padding matches
        .map((pair: [number, number]) => {
          const color1 = colors1[pair[0]];
          const color2 = colors2[pair[1]];
          // Recalculate deltaE for the matched pair using original colors
          const color1Obj = new Color("srgb", [color1.r / 255, color1.g / 255, color1.b / 255]).to("lab");
          const color2Obj = new Color("srgb", [color2.r / 255, color2.g / 255, color2.b / 255]).to("lab");
          const deltaE = color1Obj.deltaE2000(color2Obj);
          return {
            color1Index: pair[0],
            color2Index: pair[1],
            deltaE: deltaE !== undefined && !isNaN(deltaE) ? deltaE : Infinity, // Use calculated deltaE or Infinity
          };
        });

      // Calculate the total cost of the matching
      const totalCost = matchedPairs.reduce((sum, pair) => sum + pair.deltaE, 0);

      // The MICD in this context is the average deltaE of the matched pairs
      const micd = matchedPairs.length > 0 ? totalCost / matchedPairs.length : Infinity;

      return {
        micd: micd,
        palette1To2: matchedPairs.map(pair => ({
          color: colors1[pair.color1Index],
          closestInOtherPalette: colors2[pair.color2Index],
          deltaE: pair.deltaE,
        })),
        palette2To1: matchedPairs.map(pair => ({
          color: colors2[pair.color2Index],
          closestInOtherPalette: colors1[pair.color2Index], // Matched pairs are the same from both perspectives
          deltaE: pair.deltaE,
        })),
        totalPixels1: totalPixels1,
        totalPixels2: totalPixels2,
        totalCost1: totalCost / numColors1, // Total cost is the average of deltaEs of the matches
        totalCost2: totalCost / numColors2, // Average for the other palette in a 1-to-1 matching
      };
    } else if (implementation === 'micd') {
      // Original MICD Calculation Logic (Mean Inter-color Distance)
      // This calculates the average of the minimum Delta E for each color in palette 1 to any color in palette 2.
      // This is NOT the Hungarian algorithm and doesn't find an optimal one-to-one matching.
      let totalMinDeltaE1 = 0;
      const palette1To2 = colors1.map(color1 => {
      let minDeltaE = Infinity;
      let closestColor2 = null;
      for (const color2 of colors2) {
        // Skip comparison if color values are invalid
        if (color1.r < 0 || color1.r > 255 || color1.g < 0 || color1.g > 255 || color1.b < 0 || color1.b > 255) {
          console.warn(`Invalid color1 value in MICD calculation: ${JSON.stringify(color1)}. Skipping.`);
          continue;
        }
        if (color2.r < 0 || color2.r > 255 || color2.g < 0 || color2.g > 255 || color2.b < 0 || color2.b > 255) {
          console.warn(`Invalid color2 value in MICD calculation: ${JSON.stringify(color2)}. Skipping.`);
          continue;
        }

        const color1Obj = new Color("srgb", [color1.r / 255, color1.g / 255, color1.b / 255]).to("lab");
        const color2Obj = new Color("srgb", [color2.r / 255, color2.g / 255, color2.b / 255]).to("lab");
        const deltaE = color1Obj.deltaE2000(color2Obj);

        if (deltaE !== undefined && !isNaN(deltaE) && deltaE < minDeltaE) {
          minDeltaE = deltaE;
          closestColor2 = color2;
        }
      }
      if (minDeltaE !== Infinity) {
        totalMinDeltaE1 += minDeltaE;
      }
      return { color: color1, closestInOtherPalette: closestColor2, deltaE: minDeltaE };
    });
      let totalMinDeltaE2 = 0;
      const palette2To1 = colors2.map(color2 => {
        let minDeltaE = Infinity;
        let closestColor1 = null;
        for (const color1 of colors1) {
          // Skip comparison if color values are invalid
          if (color1.r < 0 || color1.r > 255 || color1.g < 0 || color1.g > 255 || color1.b < 0 || color1.b > 255) {
            console.warn(`Invalid color1 value in MICD calculation: ${JSON.stringify(color1)}. Skipping.`);
            continue;
          }
          if (color2.r < 0 || color2.r > 255 || color2.g < 0 || color2.g > 255 || color2.b < 0 || color2.b > 255) {
            console.warn(`Invalid color2 value in MICD calculation: ${JSON.stringify(color2)}. Skipping.`);
            continue;
          }
          const color1Obj = new Color("srgb", [color1.r / 255, color1.g / 255, color1.b / 255]).to("lab");
          const color2Obj = new Color("srgb", [color2.r / 255, color2.g / 255, color2.b / 255]).to("lab");
          const deltaE = color2Obj.deltaE2000(color1Obj); // Calculate Delta E in the other direction

          if (deltaE !== undefined && !isNaN(deltaE) && deltaE < minDeltaE) {
            minDeltaE = deltaE;
            closestColor1 = color1;
          }
        }
        if (minDeltaE !== Infinity) {
          totalMinDeltaE2 += minDeltaE;
        }
        return { color: color2, closestInOtherPalette: closestColor1, deltaE: minDeltaE };
      });

      // Calculate the average of the average minimum Delta E from both perspectives
      const avgMinDeltaE1 = numColors1 > 0 ? totalMinDeltaE1 / numColors1 : Infinity;
      const avgMinDeltaE2 = numColors2 > 0 ? totalMinDeltaE2 / numColors2 : Infinity;

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
    // Should not reach here if implementation is correctly 'hungarian' or 'micd'
    console.error(`Unknown implementation method: ${implementation}`);
    return Infinity;
  }, [implementation]); // Add implementation to useCallback dependencies

  const [detailedMICDExplanation, setDetailedMICDExplanation] = useState<any>(null); // Moved state declaration outside useCallback
  const findMostSimilarMovie = useCallback(async () => {
    // Update state to store an array of recommendations
    if (!selectedMovieId) {
      setTopRecommendations([]);
      setRecommendationError(null);
      return;
    }
    setIsLoadingRecommendation(true);
    setRecommendationError(null); // Clear previous error
    setTopRecommendations([]); // Clear previous recommendations
    try {
      const selectedMovieColors = await fetchPaletteColors(selectedMovieId);
      if (!selectedMovieColors) {
        setRecommendationError('Could not fetch palette colors for the selected movie.');
        setIsLoadingRecommendation(false);
        return;
      }

      const similarityScores: { movie: MoviePaletteDataWithId, micd: number }[] = [];

      for (const candidateMovie of allMovies) {
        if (candidateMovie.id === selectedMovieId) continue; // Skip the selected movie itself

        const candidateColors = await fetchPaletteColors(candidateMovie.id);
        if (!candidateColors || candidateColors.length === 0) continue; // Skip if candidate colors can't be fetched or are empty

        const micdResult = calculateMICD(selectedMovieColors, candidateColors);

        // Ensure we are comparing numbers
        const micd = typeof micdResult === 'number' ? micdResult : micdResult.micd;

        // Store the similarity score and the movie
        similarityScores.push({ movie: candidateMovie, micd: micd });
      }

      // Sort by MICD to find the top 3
      similarityScores.sort((a, b) => a.micd - b.micd);

      // Take the top 3
      const topThreeRecommendations = similarityScores.slice(0, 3);
      setTopRecommendations(topThreeRecommendations); // Set the state with the top 3

      // Calculate and store detailed explanation for the *first* best match only
      if (topThreeRecommendations.length > 0) {
        // Fetch colors for the recommended movie to calculate detailed MICD
        const recommendedMovieColors = await fetchPaletteColors(topThreeRecommendations[0].movie.id);
        if (!recommendedMovieColors) {
          console.error(`Failed to fetch colors for recommended movie: ${topThreeRecommendations[0].movie.name}`);
          setDetailedMICDExplanation(null); // Clear detailed explanation if colors cannot be fetched
        } else {
          const detailedResult = calculateMICD(selectedMovieColors, recommendedMovieColors) as {
            micd: number,
            palette1To2: any[],
            palette2To1: any[],
            totalCost1: number,
            totalCost2: number,
          };
          setTopRecommendations(topThreeRecommendations); // Set the first recommended movie for the main display
          setMicdValue(topThreeRecommendations[0].micd); // Set the MICD for the first recommended movie
          setDetailedMICDExplanation(detailedResult);
        }
      } else {
        setTopRecommendations([]);
        setMicdValue(null);
        setDetailedMICDExplanation(null); // Clear detailed explanation if no recommendation found
        setRecommendationError('No similar palette found.');
      }
    } catch (error) {
      console.error("Error finding similar movie:", error);
      setRecommendationError('An error occurred while finding a recommendation.');
    } finally {
      setIsLoadingRecommendation(false);
    }
  }, [selectedMovieId, fetchPaletteColors, calculateMICD]); // Depend on calculateMICD, not the version with details

  useEffect(() => {
    // Call findMostSimilarMovie when selectedMovieId changes
    findMostSimilarMovie();
  }, [selectedMovieId, findMostSimilarMovie]); // Include findMostSimilarMovie in dependencies

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
  const handlePaletteClick = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
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

    if (foundColor && colorFolders.includes(foundColor)) {
      console.log(`Mapped click to color: ${foundColor}`);
      setSelectedColor(foundColor);
    } else if (foundColor) {
      console.log(`Mapped click to color ${foundColor}, but no corresponding frame folder exists.`);
    } else {
      console.log(`Could not map clicked color ${colorHex} (HSV: ${hsv.h},${hsv.s},${hsv.v}) to a known frame color category.`);
    }
  };

  // Handle errors when loading frame images
  // Handler for frame image errors
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
      // Assume trailer files are PNGs for now, construct the expected trailer filename
      const trailerFilename = `${baseFilename}.png`;

      const response = await fetch(`/api/trailer-file?movieId=${selectedMovieId}&frameFile=${trailerFilename}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data: TrailerFileApiOutput = await response.json();
      if (data.success && data.trailer && data.trailer !== '') { // Check if trailer is not an empty string
        // Construct the full path for the trailer image
        console.log("Trailer image found:", data.trailer);
        // Prepend the base path if the API returns a relative path
        // Assuming API returns like '/frames/tt.../trailer/file.png'
        setTrailerImagePath(data.trailer);
      } else if (!data.success) {
        console.error("Error fetching trailer file info:", data.error);
      } else {
        // This condition means success was true but data.trailer was empty or undefined
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

  // Function to handle mood search
  const handleMoodSearch = async () => {
    console.log("handleMoodSearch triggered");
    console.log('Mood Color:', moodColor);
    if (!moodColor || moodColor === 'All') {
      setError("Please select a color for the mood search.");
      setMoodMovies({});
    }
    setIsLoadingMoodSearch(true);
    try {
      const result = findMoviesByMood(moodColor);
      // Await the promise returned by findMoviesByMood and then log and set the state
      result.then((moodMoviesResult: Record<string, MoviePaletteDataWithColorCount[]>) => {
      console.log('findMoviesByMood result (Promise):', result);
      console.log('Resolved mood movies result:', moodMoviesResult);
      setMoodMovies(moodMoviesResult);
      console.log('Mood movies set:', moodMoviesResult);
      setIsLoadingMoodSearch(false);
      setError(null);
      });
    } catch (err: any) {
      console.error("Error during mood search:", err);
      setError(`An error occurred during the mood search: ${err.message || 'Unknown error'}`);
      setIsLoadingMoodSearch(false);
      setMoodMovies({});
    } finally {
      // This block will execute regardless of success or error
      // setIsLoadingMoodSearch(false); // Already handled in .then and .catch for clarity with console logs
      setMoodMovies({}); // Clear previous mood results
    }
  };
  
  // Function to get the top 3 movies from the mood search results
  const getTopMoodMovies = (moodMovies: Record<string, MoviePaletteDataWithColorCount[]>) => {
    // Collect all movies from all genre lists
    const allMoodMoviesRaw = Object.values(moodMovies).flat();
    // Filter out duplicates based on movie ID
    const uniqueMoviesMap = new Map<string, MoviePaletteDataWithColorCount>();
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
                <form onSubmit={handleMovieSelect} className="relative flex items-center gap-3 w-full" aria-label="Search for movie palette">
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
                  className="bg-transparent relative z-10 w-full px-3 py-2 pr-10" // Added bg-transparent, relative, z-10
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
                {Object.keys(moodMovies).length > 0 && topMoodMovies.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">Top 3 matches for {moodColor} across all genres</h3>
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
                              <p className="text-sm text-muted-foreground">{((movie as MoviePaletteDataWithColorCount).colorProportion * 100).toFixed(2)}% match</p>
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
                  {Object.entries(moodMovies).map(([genre, movies]: [string, MoviePaletteDataWithColorCount[]]) => (
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
                                  />
                                </div>
                              )}
                              <CardContent className="p-3 flex flex-col items-center text-center">
                                <span className="text-base font-semibold text-primary hover:underline">
                                  {movie.name}
                                </span>
                                <p className="text-sm text-muted-foreground mb-2">{((movie as MoviePaletteDataWithColorCount).colorProportion * 100).toFixed(2)}% match</p> {/* Display proportion */}
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
                    <CardTitle className="text-xl font-semibold text-foreground">
                      {selectedColor ? `Frames for ${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}` : "Movie Frames by Color"}
                    </CardTitle>
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
                      <CardDescription className="text-center text-muted-foreground text-sm">
                        {selectedColor ? `Showing frames where ${selectedColor} is dominant. Click a frame for details.` : 'Select a dominant color category from the palette above.'}
                      </CardDescription>
                    </CardHeader>
                      <CardContent className="p-4 md:p-6">
                          {isLoadingFolders ? (
                            <div className="flex justify-center items-center p-6">
                              <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                              <span className="ml-2 text-muted-foreground">Loading frame data...</span>
                            </div>
                          ) : colorFolders.length === 0 && !isLoadingFolders ? (
                                <p className="text-center text-muted-foreground p-6">No frame color data found for this movie.</p>
                          ) : !selectedColor ? (
                                <p className="text-center text-muted-foreground p-6">Click on the color palette above to see corresponding frames.</p>
                          ) : isLoadingFrameFiles[selectedColor] ? (
                              <div className="flex justify-center items-center p-6">
                                <Loader2 className="h-5 w-5 animate-spin text-primary"/>
                                <span className="ml-2 text-muted-foreground text-sm">Loading frames for {selectedColor}...</span>
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                              {(frameFiles[selectedColor] && frameFiles[selectedColor].length > 0) ? (
                                  [...frameFiles[selectedColor]].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((file) => {
                                    if(!selectedMovieId || !selectedColor) return null;
                                    const framePath = `/frames/${selectedMovieId}/${selectedColor}/${file}`;
                                    const hasError = frameErrors[selectedColor]?.[file] ?? false;
                                    return (
                                      <div
                                        key={file}
                                        className={cn(
                                            "relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border group transition-opacity",
                                            hasError ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:opacity-90'
                                        )}
                                        onClick={() => !hasError && handleFrameClick(file)}
                                        role="button"
                                        tabIndex={hasError ? -1 : 0} // Make it focusable only if not error
                                        aria-label={hasError ? `Frame ${file} failed to load` : `View frame ${file}`}
                                        onKeyDown={(e) => { if (!hasError && (e.key === 'Enter' || e.key === ' ')) { handleFrameClick(file); }}} // Keyboard accessibility
                                      >
                                        {!hasError ? (
                                          <Image
                                              src={framePath}
                                              alt={`Frame ${file} highlighting color ${selectedColor} from ${selectedMovieData.name}`}
                                              fill // Use fill for responsive images
                                              className="object-cover transition-transform duration-200 group-hover:scale-105" // Subtle hover effect
                                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" // Optimize image loading
                                              onError={() => handleFrameImageError(selectedColor, file)}
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
                                      No representative frames found for the color {selectedColor}.
                                  </div>
                              )}
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
                                  <p className="text-sm text-muted-foreground">MICD: {recommendation.micd.toFixed(2)}</p>
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
                      recommendedMovieMICD={topRecommendations[0].micd}
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
const allMovies: MoviePaletteDataWithId[] = getAllMoviePalettes()
 .map(movie => ({
 ...movie,
 id: movie.id, // Ensure the id field is explicitly included
  }))
 .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name