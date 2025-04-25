
"use client";

import type { ReactElement } from 'react';
import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { moviePalettes, getMoviePaletteById, type MoviePaletteData } from '@/data/movie-palettes'; // Ensure moviePalettes is exported if needed, though getMoviePaletteById is primary now
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2, Search } from 'lucide-react'; // Using Loader2 for a spinning icon, Search for button
import Image from 'next/image';

// Define a type for the color explanations state
type ColorExplanations = Record<string, string | null | 'loading' | 'error'>; // color hex -> explanation, loading, error or null if not fetched

export default function CinePaletteExplorer(): ReactElement {
  const [inputValue, setInputValue] = useState<string>(''); // State for the input field
  const [selectedMovieId, setSelectedMovieId] = useState<string>(''); // Keep track of the *validated* movie ID
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null);
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({}); // Track loading per color
  const [error, setError] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});

  // Effect to fetch movie data when a *valid* selectedMovieId is set
  useEffect(() => {
    if (selectedMovieId) {
      const movieData = getMoviePaletteById(selectedMovieId);
      if (movieData) {
        setSelectedMovieData(movieData);
        setColorExplanations({}); // Reset explanations when movie changes
        setIsLoadingExplanation({}); // Reset loading states
        setError(null); // Clear previous errors related to fetching data
      } else {
        // This case might happen if the data source changes unexpectedly
        setSelectedMovieData(null);
        setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
        setColorExplanations({});
        setIsLoadingExplanation({});
      }
    } else {
      // If selectedMovieId is cleared (e.g., due to invalid input), clear the data
      setSelectedMovieData(null);
       // Don't clear error here, it might be set by handleMovieSelect
    }
  }, [selectedMovieId]); // Re-run effect only when the validated selectedMovieId changes

  // Function to handle the search/selection based on input
  const handleMovieSelect = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault(); // Prevent form submission page reload if used in a form
    const trimmedId = inputValue.trim();

    if (!trimmedId) {
      setError("Please enter a movie ID.");
      setSelectedMovieId(''); // Clear selection
      return;
    }

    const movieData = getMoviePaletteById(trimmedId);

    if (movieData) {
      setSelectedMovieId(movieData.id); // Set the valid ID, triggering the useEffect
      setError(null); // Clear previous errors
    } else {
      setSelectedMovieId(''); // Clear selection as ID is invalid
      setError(`Movie ID "${trimmedId}" not found in our data. Please check the ID (e.g., tt0111161) and try again.`);
      // No need to clear data here, useEffect handles it when selectedMovieId becomes empty
    }
  };


  const fetchColorExplanation = useCallback(async (color: string) => {
    if (!selectedMovieId || !color || isLoadingExplanation[color] || colorExplanations[color] === 'loading') return; // Prevent multiple fetches or fetching without ID

    // Only refetch if explanation doesn't exist or had an error previously
    if (colorExplanations[color] === 'error' || !colorExplanations[color] ) {
        setIsLoadingExplanation(prev => ({ ...prev, [color]: true }));
        setColorExplanations(prev => ({ ...prev, [color]: 'loading' })); // Set state to 'loading'

        try {
          const result: ExplainColorPaletteOutput = await explainColorPalette({ movieId: selectedMovieId, color });
          setColorExplanations(prev => ({ ...prev, [color]: result.explanation }));
        } catch (err) {
          console.error(`Error fetching explanation for color ${color} (Movie ID: ${selectedMovieId}):`, err);
          setColorExplanations(prev => ({ ...prev, [color]: "error" })); // Indicate error state
          // Optionally set a general error as well, or rely on the tooltip message
          // setError(`Failed to get explanation for ${color}.`);
        } finally {
          setIsLoadingExplanation(prev => ({ ...prev, [color]: false }));
        }
    }
  }, [selectedMovieId, colorExplanations, isLoadingExplanation]); // Dependencies


  const handleColorInteraction = (color: string) => {
    // Fetch explanation only if it hasn't been successfully fetched or isn't loading
    if (colorExplanations[color] !== 'loading' && typeof colorExplanations[color] !== 'string') {
       fetchColorExplanation(color);
    }
  };

   const toggleTooltip = (color: string, isOpen: boolean) => {
     setTooltipOpen(prev => ({...prev, [color]: isOpen }));
     // Fetch explanation when tooltip opens if it's not already loaded/loading/error
     if(isOpen && colorExplanations[color] !== 'loading' && typeof colorExplanations[color] !== 'string') {
        fetchColorExplanation(color);
     }
   }


  const videoUrl = selectedMovieId ? `https://www.imdb.com/title/${selectedMovieId}/` : '';

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center">
      <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className="bg-muted/40 p-4 border-b border-border">
          <CardTitle className="text-2xl font-bold text-center text-primary">CinePalette Explorer</CardTitle>
           <CardDescription className="text-center text-muted-foreground">Enter a movie's IMDb ID (e.g., tt0111161) to explore its visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Movie ID Input */}
          <form onSubmit={handleMovieSelect} className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
            <Label htmlFor="movie-id-input" className="sr-only">Movie ID:</Label>
            <Input
              id="movie-id-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter IMDb ID (e.g., tt0111161)"
              className="flex-grow text-base bg-background border-input ring-offset-background focus:ring-ring"
              aria-label="Enter Movie IMDb ID"
            />
            <Button type="submit" aria-label="Load Movie Palette">
               <Search className="mr-2 h-4 w-4" /> Load Palette
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
               <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Display Area: Shows content only when a valid movie is selected */}
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
                    <CardTitle className="text-xl font-semibold text-center text-foreground">Color Palette for {selectedMovieData.name}</CardTitle>
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
                                className="rounded border border-muted shadow-inner object-contain w-full max-w-lg" // Use object-contain
                                priority // Load the palette image eagerly
                                unoptimized // If palettes are simple PNGs, optimization might not be needed
                                // Add error handling for the image itself if needed
                                onError={(e) => {
                                    console.error('Error loading palette image:', e);
                                    // Optionally show a placeholder or error message for the image
                                }}
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
                                         ) : colorExplanations[color] === 'error' ? (
                                            <p className="text-destructive">Could not fetch explanation.</p>
                                        ) : typeof colorExplanations[color] === 'string' ? (
                                            <p>{colorExplanations[color]}</p>
                                        ) : (
                                             <p className="text-muted-foreground">Hover or click to load explanation...</p> // Initial state before interaction
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                         </div>
                     </TooltipProvider>
                  </CardContent>
               </Card>
            </>
           ) : !error && !selectedMovieId ? (
            // Initial state before any selection or if input is cleared without error
            <div className="text-center py-10 text-muted-foreground">
                 <p>Enter a movie ID above to begin exploring.</p>
            </div>
          ) : null /* Error state is handled by the Alert component */
          }
        </CardContent>
      </Card>
    </div>
  );
}
    