
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
import { getMoviePaletteById, type MoviePaletteData } from '@/data/movie-palettes'; // Only import necessary functions/types
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2, Search, Image as ImageIcon, AlertCircle } from 'lucide-react'; // Using Loader2 for a spinning icon, Search for button, AlertCircle for error
import Image from 'next/image';
import { getColorFrameFolders, type GetColorFrameFoldersOutput } from '@/actions/get-color-frames'; // Import the server action

// Define a type for the color explanations state
type ColorExplanations = Record<string, string | null | 'loading' | 'error'>; // color hex -> explanation, loading, error or null if not fetched
type FrameErrorState = Record<string, boolean>; // key: `${color}-${index}`, value: boolean

export default function CinePaletteExplorer(): ReactElement {
  const [inputValue, setInputValue] = useState<string>(''); // State for the input field
  const [selectedMovieId, setSelectedMovieId] = useState<string>(''); // Keep track of the *validated* movie ID
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null);
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({}); // Track loading per color
  const [error, setError] = useState<string | null>(null);
  const [colorFolders, setColorFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false); // State for loading folders
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});
  const [paletteImageError, setPaletteImageError] = useState<boolean>(false);
  const [frameErrors, setFrameErrors] = useState<FrameErrorState>({}); // State to track frame image errors


  // Effect to fetch movie data and color folders when a *valid* selectedMovieId is set
  useEffect(() => {
    if (selectedMovieId) {
      const movieData = getMoviePaletteById(selectedMovieId);
      if (movieData) {
        setSelectedMovieData(movieData);
        // Reset state for the new movie
        setColorExplanations({});
        setIsLoadingExplanation({});
        setSelectedColor(null); // Reset selected color
        setError(null); // Clear previous errors
        setPaletteImageError(false); // Reset palette image error
        setFrameErrors({}); // Reset frame errors

        // Fetch color folders using the server action
        const fetchFolders = async () => {
          setIsLoadingFolders(true);
          setColorFolders([]); // Clear old folders
          try {
            const result: GetColorFrameFoldersOutput = await getColorFrameFolders({ movieId: selectedMovieId });
            if (result.success && result.data) {
              setColorFolders(result.data);
               if (result.data.length === 0) {
                 console.log(`No frame folders found for ${selectedMovieId}.`);
                 // Optionally set a specific message if needed, but might be handled by empty UI
               }
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

      } else {
        setSelectedMovieData(null);
        setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
        setColorExplanations({});
        setIsLoadingExplanation({});
        setSelectedColor(null);
        setColorFolders([]); // Clear folders on data error
        setPaletteImageError(false);
        setFrameErrors({});
      }
    } else {
      setSelectedMovieData(null);
      setColorFolders([]); // Clear folders if no movie selected
       // Don't clear error here, it might be set by handleMovieSelect
       setPaletteImageError(false);
       setFrameErrors({});
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

    // Basic validation for IMDb ID format (tt followed by digits)
    if (!/^tt\d+$/.test(trimmedId)) {
        setError(`Invalid IMDb ID format. Please use the format "tt" followed by numbers (e.g., tt0111161).`);
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

  const handlePaletteImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.error('Error loading palette image:', selectedMovieData?.palettePath, e);
      setPaletteImageError(true);
      (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image element
  };

  const handleFrameImageError = (color: string, index: number) => {
     const key = `${color}-${index}`;
     console.error(`Error loading frame image: /frames/${selectedMovieId}/${color}/${index}.jpg`);
     setFrameErrors(prev => ({ ...prev, [key]: true }));
  };


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
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                     {/* Palette Image */}
                     {selectedMovieData.palettePath && !paletteImageError && (
                         <div className="mb-6 flex justify-center">
                             <Image
                                key={`palette-${selectedMovieId}`}
                                src={selectedMovieData.palettePath} // Use the path from data (relative to /public)
                                alt={`Visual color palette representation for ${selectedMovieData.name}`}
                                width={800}
                                height={60} // Adjust height based on typical palette image aspect ratio
                                className="rounded border border-muted shadow-inner object-contain w-full max-w-lg" // Use object-contain
                                priority // Load the palette image eagerly
                                // unoptimized // If palettes are simple PNGs, optimization might not be needed
                                onError={handlePaletteImageError}
                             />
                         </div>
                     )}
                     {paletteImageError && (
                        <div className="mb-6 flex justify-center items-center p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-md text-sm">
                            <AlertCircle className="h-5 w-5 mr-2"/>
                            Could not load the color palette image. Please ensure the file exists at the correct path.
                        </div>
                     )}

                       {/* Movie Frames Section */}
                       <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                            <CardHeader className="p-4 border-b border-border bg-muted/40">
                                <CardTitle className="text-xl font-semibold text-center text-foreground">Movie Frames by Color</CardTitle>
                                <CardDescription className="text-center text-muted-foreground text-sm">Select a dominant color to see corresponding frames.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6">
                                {isLoadingFolders ? (
                                     <div className="flex justify-center items-center p-6">
                                         <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                                         <span className="ml-2 text-muted-foreground">Loading frame data...</span>
                                     </div>
                                ) : colorFolders.length > 0 ? (
                                    <>
                                        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-6">
                                            {colorFolders.map((folderName) => (
                                                <Button
                                                key={folderName}
                                                variant={selectedColor === folderName ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedColor(folderName)}
                                                className={`border border-border hover:border-foreground`}
                                                style={{ backgroundColor: selectedColor === folderName ? undefined : folderName, color: selectedColor === folderName ? undefined : '#ffffff' }} // Show color on button
                                                >
                                                {folderName}
                                                </Button>
                                            ))}
                                        </div>
                                        {selectedColor && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {/* Assuming 10 frames per color */}
                                                {Array.from({ length: 10 }).map((_, index) => {
                                                   const frameKey = `${selectedColor}-${index}`;
                                                   const framePath = `/frames/${selectedMovieId}/${selectedColor}/${index}.jpg`;
                                                   const hasError = frameErrors[frameKey];

                                                   return (
                                                      <div key={frameKey} className="relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border">
                                                            {hasError ? (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-xs text-destructive p-2 bg-destructive/10">
                                                                     <AlertCircle className="h-5 w-5 mb-1"/>
                                                                     <span>Frame missing</span>
                                                                </div>
                                                            ) : (
                                                                <Image
                                                                    src={framePath}
                                                                    alt={`Frame ${index + 1} highlighting color ${selectedColor} from ${selectedMovieData.name}`}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" // Optimize image loading
                                                                    onError={() => handleFrameImageError(selectedColor, index)}
                                                                />
                                                            )}
                                                       </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                     </>
                                ) : (
                                    <p className="text-center text-muted-foreground p-6">No representative frames found for this movie.</p>
                                )}
                           </CardContent>
                       </Card>
                  </CardContent>
               </Card>
            </>
           ) : !error && !selectedMovieId ? (
            // Initial state before any selection or if input is cleared without error
            <div className="text-center py-10 text-muted-foreground">
                 <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                 <p>Enter a movie ID above to begin exploring.</p>
            </div>
          ) : null /* Error state is handled by the Alert component */
          }
        </CardContent>
      </Card>
    </div>
  );
}

    