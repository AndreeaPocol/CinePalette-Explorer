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
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2 } from 'lucide-react'; // Using Loader2 for a spinning icon
import Image from 'next/image';

// Define a type for the color explanations state
type ColorExplanations = Record<string, string | null | 'loading' | 'error'>; // color hex -> explanation, loading, error or null if not fetched

export default function CinePaletteExplorer(): ReactElement {
  const [selectedMovieId, setSelectedMovieId] = useState<string>(moviePalettes[0]?.id || '');
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null);
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({}); // Track loading per color
  const [error, setError] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Ensure the initial selection or subsequent selections always find data
    // If the current selectedMovieId isn't valid, default to the first available movie
    let movieData = getMoviePaletteById(selectedMovieId);
    if (!movieData && moviePalettes.length > 0) {
        const firstMovieId = moviePalettes[0].id;
        setSelectedMovieId(firstMovieId); // Update state to valid ID
        movieData = moviePalettes[0];      // Use first movie data
    }


    if (movieData) {
      setSelectedMovieData(movieData);
      setColorExplanations({}); // Reset explanations when movie changes
      setIsLoadingExplanation({}); // Reset loading states
      setError(null); // Reset error
    } else {
      // This case should ideally not happen if moviePalettes is not empty
      setSelectedMovieData(null);
      setError("No movie data available.");
    }
  }, [selectedMovieId]); // Re-run effect when selectedMovieId changes

  const fetchColorExplanation = useCallback(async (color: string) => {
    if (!selectedMovieId || !color || isLoadingExplanation[color] || colorExplanations[color]) return; // Prevent multiple fetches

    setIsLoadingExplanation(prev => ({ ...prev, [color]: true }));
    setColorExplanations(prev => ({ ...prev, [color]: 'loading' })); // Set state to 'loading'

    try {
      const result: ExplainColorPaletteOutput = await explainColorPalette({ movieId: selectedMovieId, color });
      setColorExplanations(prev => ({ ...prev, [color]: result.explanation }));
    } catch (err) {
      console.error(`Error fetching explanation for color ${color}:`, err);
      setColorExplanations(prev => ({ ...prev, [color]: "Could not fetch explanation." })); // Indicate error
      setError(`Failed to get explanation for ${color}. Check console.`); // More specific error
    } finally {
      setIsLoadingExplanation(prev => ({ ...prev, [color]: false }));
    }
  }, [selectedMovieId, colorExplanations, isLoadingExplanation]);

  const handleColorInteraction = (color: string) => {
    // Fetch explanation only if it hasn't been fetched, isn't loading, and isn't an error state
    if (!colorExplanations[color] && !isLoadingExplanation[color]) {
      fetchColorExplanation(color);
    }
  };

   const toggleTooltip = (color: string, isOpen: boolean) => {
     setTooltipOpen(prev => ({...prev, [color]: isOpen }));
     // Fetch explanation when tooltip opens if it's not already loaded/loading/error
     if(isOpen && !colorExplanations[color] && !isLoadingExplanation[color]) {
        fetchColorExplanation(color);
     }
   }


  const videoUrl = selectedMovieId ? `https://www.imdb.com/title/${selectedMovieId}/` : '';

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center">
      <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className="bg-muted/40 p-4 border-b border-border">
          <CardTitle className="text-2xl font-bold text-center text-primary">CinePalette Explorer</CardTitle>
           <CardDescription className="text-center text-muted-foreground">Select a movie to explore its visual identity through color.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Movie Selection */}
          <div className="flex flex-col items-center space-y-2">
             <label htmlFor="movie-select" className="text-lg font-semibold text-foreground">Select Movie:</label>
             {/* The Select component uses moviePalettes from src/data/movie-palettes.ts to populate options */}
            <Select value={selectedMovieId} onValueChange={setSelectedMovieId}>
              <SelectTrigger id="movie-select" className="w-full max-w-md text-base bg-background border-input ring-offset-background focus:ring-ring" aria-label="Select a movie">
                <SelectValue placeholder="Select a movie..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                {moviePalettes.map((movie) => (
                  <SelectItem
                    key={movie.id}
                    value={movie.id}
                    className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                  >
                    {movie.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
               <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedMovieData ? (
            <>
              {/* Video Placeholder/Link */}
              <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-muted flex flex-col items-center justify-center text-center p-4 border border-border">
                 <h3 className="text-lg font-semibold mb-2 text-foreground">{selectedMovieData.name}</h3>
                 <p className="text-sm text-muted-foreground mb-4">Visuals are best experienced directly.</p>
                 <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                    aria-label={`View ${selectedMovieData.name} on IMDB (opens in new tab)`}
                  >
                    View on IMDB
                 </a>
                 <p className="text-xs text-muted-foreground mt-3">(IMDb embedding restrictions prevent direct display)</p>
              </div>


              {/* Color Palette Display */}
               <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                  <CardHeader className="p-4 border-b border-border bg-muted/40">
                    <CardTitle className="text-xl font-semibold text-center text-foreground">Color Palette</CardTitle>
                    <CardDescription className="text-center text-muted-foreground text-sm">Hover or click on a color swatch to learn about its significance.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                     {/* Palette Image */}
                     {selectedMovieData.palettePath && (
                         <div className="mb-6 flex justify-center">
                             <Image
                                // Key ensures image re-renders when path changes
                                key={selectedMovieData.palettePath}
                                src={selectedMovieData.palettePath}
                                alt={`Visual color palette representation for ${selectedMovieData.name}`}
                                width={600}
                                height={60} // Adjust height based on typical palette image aspect ratio
                                className="rounded border border-muted shadow-inner object-cover w-full max-w-lg" // Make image responsive
                                priority // Load the palette image eagerly
                                unoptimized // If palettes are simple PNGs, optimization might not be needed
                             />
                         </div>
                     )}

                     {/* Interactive Color Swatches */}
                     <TooltipProvider delayDuration={100}>
                         <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                            {selectedMovieData.colors.map((color) => (
                                <Tooltip key={color} open={tooltipOpen[color]} onOpenChange={(open) => toggleTooltip(color, open)}>
                                    <TooltipTrigger asChild>
                                        <button
                                            aria-label={`Explain color ${color}`}
                                            onClick={() => handleColorInteraction(color)}
                                            onMouseEnter={() => handleColorInteraction(color)} // Trigger fetch on hover too
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-muted/50 hover:border-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out transform hover:scale-110 shadow-md cursor-pointer"
                                            style={{ backgroundColor: color }}
                                         />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs bg-popover text-popover-foreground border border-border shadow-lg rounded-md p-3 text-sm">
                                        {isLoadingExplanation[color] || colorExplanations[color] === 'loading' ? (
                                            <div className="flex items-center space-x-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-primary"/>
                                                <span>Loading analysis...</span>
                                            </div>
                                        ) : colorExplanations[color] && colorExplanations[color] !== 'error' ? (
                                            <p>{colorExplanations[color]}</p>
                                        ) : colorExplanations[color] === 'error' ? (
                                            <p className="text-destructive">Could not fetch explanation.</p>
                                        ) : (
                                            <p className="text-muted-foreground">Hover or click again to load...</p> // Initial state before interaction
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                         </div>
                     </TooltipProvider>
                  </CardContent>
               </Card>
            </>
          ) : (
            // Loading Skeleton
            <div className="space-y-6 pt-6">
              <Skeleton className="aspect-video w-full rounded-lg bg-muted" />
              <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm">
                 <CardHeader className="p-4 border-b border-border bg-muted/40">
                    <Skeleton className="h-6 w-1/2 mx-auto bg-muted-foreground/30" />
                    <Skeleton className="h-4 w-3/4 mx-auto mt-2 bg-muted-foreground/20" />
                 </CardHeader>
                 <CardContent className="p-4 md:p-6">
                    <Skeleton className="h-16 w-full mb-6 bg-muted/80" />
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                       {[...Array(5)].map((_, i) => (
                         <Skeleton key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted" />
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