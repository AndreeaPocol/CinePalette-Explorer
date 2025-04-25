"use client";

import type { ReactElement } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { moviePalettes, getMoviePaletteById, type MoviePaletteData } from '@/data/movie-palettes';
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette'; // Assuming this path is correct based on your setup
import { Info } from 'lucide-react';
import Image from 'next/image';

// Define a type for the color explanations state
type ColorExplanations = Record<string, string | null>; // color hex -> explanation or null if loading/error

export default function CinePaletteExplorer(): ReactElement {
  const [selectedMovieId, setSelectedMovieId] = useState<string>(moviePalettes[0]?.id || '');
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null);
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({});
  const [isLoadingExplanations, setIsLoadingExplanations] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const movieData = getMoviePaletteById(selectedMovieId);
    if (movieData) {
      setSelectedMovieData(movieData);
      setColorExplanations({}); // Reset explanations when movie changes
      setError(null); // Reset error
    } else {
      setSelectedMovieData(null);
      setError("Movie data not found.");
    }
  }, [selectedMovieId]);

  const fetchColorExplanation = useCallback(async (color: string) => {
    if (!selectedMovieId || !color) return;

    setColorExplanations(prev => ({ ...prev, [color]: null })); // Set to null to indicate loading
    setIsLoadingExplanations(true);

    try {
      const result: ExplainColorPaletteOutput = await explainColorPalette({ movieId: selectedMovieId, color });
      setColorExplanations(prev => ({ ...prev, [color]: result.explanation }));
    } catch (err) {
      console.error(`Error fetching explanation for color ${color}:`, err);
      setColorExplanations(prev => ({ ...prev, [color]: "Could not fetch explanation." }));
      // Optionally set a global error state
      setError(`Failed to get explanation for color ${color}. Please try again later.`);
    } finally {
      // Check if all explanations are fetched or failed
       const allFetched = selectedMovieData?.colors.every(c => colorExplanations[c] !== null && colorExplanations[c] !== undefined) ?? false;
       if (allFetched) {
            setIsLoadingExplanations(false);
       }
       // This logic might need adjustment if multiple requests are in flight and one fails early
        const remainingColors = selectedMovieData?.colors.filter(c => colorExplanations[c] === null) ?? [];
        if (remainingColors.length === 0) {
            setIsLoadingExplanations(false);
        }

    }
  }, [selectedMovieId, selectedMovieData, colorExplanations]); // Added colorExplanations dependency

  const handleColorClick = (color: string) => {
    // Only fetch if not already fetched or currently loading
    if (colorExplanations[color] === undefined) {
      fetchColorExplanation(color);
    }
  };

  const toggleTooltip = (color: string, isOpen: boolean) => {
     setTooltipOpen(prev => ({...prev, [color]: isOpen }));
     if(isOpen && colorExplanations[color] === undefined){
        handleColorClick(color); // Fetch explanation when tooltip opens if not already present
     }
  }


  const videoUrl = selectedMovieId ? `https://www.imdb.com/title/${selectedMovieId}/` : '';

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center">
      <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden">
        <CardHeader className="bg-muted/30 p-4 border-b border-border">
          <CardTitle className="text-2xl font-bold text-center text-primary">CinePalette Explorer</CardTitle>
           <CardDescription className="text-center text-muted-foreground">Select a movie to explore its visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Movie Selection */}
          <div className="flex flex-col items-center space-y-2">
             <label htmlFor="movie-select" className="text-lg font-semibold">Select Movie:</label>
            <Select value={selectedMovieId} onValueChange={setSelectedMovieId}>
              <SelectTrigger id="movie-select" className="w-full max-w-md text-base" aria-label="Select a movie">
                <SelectValue placeholder="Select a movie..." />
              </SelectTrigger>
              <SelectContent>
                {moviePalettes.map((movie) => (
                  <SelectItem key={movie.id} value={movie.id}>
                    {movie.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedMovieData ? (
            <>
              {/* Video Display */}
              <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md">
                {/* Using an iframe for external content like IMDB is tricky due to X-Frame-Options.
                    A simple link might be more reliable, or using an official embed if available.
                    For demonstration, showing a placeholder or link. */}
                 <div className="bg-muted w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <p className="text-lg mb-2">Movie Trailer</p>
                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        aria-label={`Watch trailer for ${selectedMovieData.name} on IMDB (opens in new tab)`}
                    >
                        View on IMDB
                    </a>
                     <p className="text-sm mt-2">(IMDB embed limitations prevent direct display)</p>
                </div>

                {/* Placeholder iframe attempt - likely blocked */}
                {/* <iframe
                  src={videoUrl} // This will likely be blocked by IMDB
                  title={`Trailer for ${selectedMovieData.name}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin" // Might help but often insufficient for cross-origin restrictions
                ></iframe> */}
              </div>

              {/* Color Palette Display */}
               <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm">
                  <CardHeader className="p-4 border-b border-border">
                    <CardTitle className="text-xl font-semibold text-center">Color Palette</CardTitle>
                    <CardDescription className="text-center text-muted-foreground">Click or hover over a color to understand its significance in the movie.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex justify-center mb-4">
                         <Image
                            src={selectedMovieData.palettePath}
                            alt={`Color palette for ${selectedMovieData.name}`}
                            width={500} // Adjust width as needed
                            height={100} // Adjust height as needed
                            className="rounded-md shadow-inner border border-muted"
                            priority // Load the palette image eagerly
                         />
                    </div>
                     <TooltipProvider delayDuration={100}>
                         <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4">
                            {selectedMovieData.colors.map((color) => (
                                <Tooltip key={color} open={tooltipOpen[color]} onOpenChange={(open) => toggleTooltip(color, open)}>
                                    <TooltipTrigger asChild>
                                        <button
                                            aria-label={`Explain color ${color}`}
                                            onClick={() => handleColorClick(color)}
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-muted hover:border-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out transform hover:scale-110 shadow-md"
                                            style={{ backgroundColor: color }}
                                         />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs bg-popover text-popover-foreground border border-border shadow-lg rounded-md p-3 text-sm">
                                        {colorExplanations[color] === null && !isLoadingExplanations ? (
                                            <div className="flex items-center space-x-2">
                                                <Info className="w-4 h-4 animate-pulse"/>
                                                <span>Click to load explanation...</span>
                                            </div>
                                        ) : colorExplanations[color] === null && isLoadingExplanations ? (
                                            <div className="flex items-center space-x-2">
                                                <Skeleton className="h-4 w-4 rounded-full" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        ) : (
                                            <p>{colorExplanations[color]}</p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                         </div>
                     </TooltipProvider>
                     {isLoadingExplanations && (
                        <div className="text-center mt-4 text-muted-foreground flex items-center justify-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             <span>Loading explanations...</span>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </>
          ) : (
            // Loading Skeleton or Initial State
            <div className="space-y-6">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Card className="mt-6">
                 <CardHeader className="p-4 border-b">
                    <Skeleton className="h-6 w-1/3 mx-auto" />
                 </CardHeader>
                 <CardContent className="p-4 md:p-6">
                    <Skeleton className="h-16 w-full mb-4" />
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4">
                       {[...Array(5)].map((_, i) => (
                         <Skeleton key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
                       ))}
                    </div>
                 </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
