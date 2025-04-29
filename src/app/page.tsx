
"use client";

import type { ReactElement, SyntheticEvent } from 'react';
import React, { useState, useEffect, useCallback, FormEvent, Fragment, } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getMoviePaletteById, type MoviePaletteData } from '@/data/movie-palettes';
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2, Search, Image as ImageIcon, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { getColorFrameFolders, type GetColorFrameFoldersOutput } from '@/actions/get-color-frames';
import type { FrameFilesApiOutput } from '@/app/api/frame-files/route';
import type { TrailerFileApiOutput } from '@/app/api/trailer-file/route';

type ColorExplanations = Record<string, string | null | 'loading' | 'error'>;
type FrameErrorState = Record<string, boolean>;
type FrameFiles = Record<string, string[]>; // Stores filenames for each color

export default function CinePaletteExplorer(): ReactElement {
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null);
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [colorFolders, setColorFolders] = useState<string[]>([]); // Stores color hex folder names
  const [selectedFramePath, setSelectedFramePath] = useState<string | null>(null); // Path to the selected frame for modal
  const [trailerImagePath, setTrailerImagePath] = useState<string | null>(null); // Path to the corresponding trailer image
  const [isFrameModalOpen, setIsFrameModalOpen] = useState<boolean>(false);

  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // The currently selected color folder
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});
  const [paletteImageError, setPaletteImageError] = useState<boolean>(false);
  const [frameErrors, setFrameErrors] = useState<Record<string, Record<string, boolean>>>({}); // Track errors per color/frame index
  const [frameFiles, setFrameFiles] = useState<FrameFiles>({}); // Stores filenames for each color
  const [isLoadingFrameFiles, setIsLoadingFrameFiles] = useState<Record<string, boolean>>({}); // Track loading state per color


  useEffect(() => {
    if (selectedMovieId) {
      const movieData = getMoviePaletteById(selectedMovieId);
      if (movieData) {
        setSelectedMovieData(movieData);
        setColorExplanations({});
        setIsLoadingExplanation({});
        setSelectedColor(null);
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
              setColorFolders(result.data);
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

      } else {
        setSelectedMovieData(null);
        setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
        setColorExplanations({});
        setIsLoadingExplanation({});
        setSelectedColor(null);
        setColorFolders([]);
        setPaletteImageError(false);
        setFrameErrors({});
        setFrameFiles({});
        setIsLoadingFrameFiles({});
      }
    } else {
      setSelectedMovieData(null);
      setColorFolders([]);
      setPaletteImageError(false);
      setFrameErrors({});
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
    const trimmedId = inputValue.trim();

    if (!trimmedId) {
      setError("Please enter a movie ID.");
      setSelectedMovieId('');
      return;
    }

    if (!/^tt\d+$/.test(trimmedId)) {
        setError(`Invalid IMDb ID format. Please use the format "tt" followed by numbers (e.g., tt0111161).`);
        setSelectedMovieId('');
        return;
    }

    const movieData = getMoviePaletteById(trimmedId);

    if (movieData) {
      setSelectedMovieId(movieData.id); // This triggers the useEffect hook
      setError(null);
    } else {
      setSelectedMovieId('');
      setError(`Movie ID "${trimmedId}" not found in our data. Please check the ID (e.g., tt0111161) and try again.`);
    }
  };


  const fetchColorExplanation = useCallback(async (color: string) => {
    if (!selectedMovieId || !color || isLoadingExplanation[color] || colorExplanations[color] === 'loading') return;

    if (colorExplanations[color] === 'error' || !colorExplanations[color] ) {
        setIsLoadingExplanation(prev => ({ ...prev, [color]: true }));
        setColorExplanations(prev => ({ ...prev, [color]: 'loading' }));

        try {
          const result: ExplainColorPaletteOutput = await explainColorPalette({ movieId: selectedMovieId, color: color });
          setColorExplanations(prev => ({ ...prev, [color]: result.explanation }));
        } catch (err) {
          console.error(`Error fetching explanation for color ${color} (Movie ID: ${selectedMovieId}):`, err);
          setColorExplanations(prev => ({ ...prev, [color]: "error" }));
        } finally {
          setIsLoadingExplanation(prev => ({ ...prev, [color]: false }));
        }
    }
  }, [selectedMovieId, colorExplanations, isLoadingExplanation]);


  const handleColorInteraction = (color: string) => {
    if (colorExplanations[color] !== 'loading' && typeof colorExplanations[color] !== 'string') {
       fetchColorExplanation(color);
    }
  };

   const toggleTooltip = (color: string, isOpen: boolean) => {
     setTooltipOpen(prev => ({...prev, [color]: isOpen }));
     if(isOpen && colorExplanations[color] !== 'loading' && typeof colorExplanations[color] !== 'string') {
        fetchColorExplanation(color);
     }
   }


  const videoUrl = selectedMovieId ? `https://www.imdb.com/title/${selectedMovieId}/` : '';

  const handlePaletteImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
      if (selectedMovieData) {
        console.error('Error loading palette image:', selectedMovieData.palettePath, e);
        setPaletteImageError(true);
      }
  };

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

  const handleFrameClick = async (frameFile: string) => {
    if (!selectedMovieId || !selectedColor) return;

    const framePath = `/frames/${selectedMovieId}/${selectedColor}/${frameFile}`;
    setSelectedFramePath(framePath); // Set the path for the main enlarged frame

    // Reset trailer image path initially
    setTrailerImagePath(null);

    try {
      const response = await fetch(`/api/trailer-file?movieId=${selectedMovieId}&frameFile=${frameFile}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data: TrailerFileApiOutput = await response.json();

      if (data.success && data.trailer) {
        // Construct the full path for the trailer image
        const trailerPath = `/trailers/${selectedMovieId}/${data.trailer}`;
        setTrailerImagePath(trailerPath);
      } else if (!data.success) {
          console.error("Error fetching trailer file info:", data.error);
      } else {
         console.log(`No corresponding trailer file found for frame: ${frameFile}`);
      }
    } catch (error) {
       console.error("Error calling trailer API:", error);
    }

    setIsFrameModalOpen(true); // Open the modal
  };


  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center">
      <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className="bg-muted/40 p-4 border-b border-border">
          <CardTitle className="text-2xl font-bold text-center text-primary">CinePalette Explorer</CardTitle>
           <CardDescription className="text-center text-muted-foreground">Enter a movie's IMDb ID (e.g., tt0111161) to explore its visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
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

          {selectedMovieData ? (
             <Fragment>
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
                                key={selectedFramePath} // Ensure re-render on change
                                src={selectedFramePath}
                                alt={`Selected Frame Preview`}
                                fill
                                className="object-contain" // Use contain to see the whole frame
                                sizes="(max-width: 768px) 100vw, 50vw"
                                onError={() => console.error(`Error loading selected frame: ${selectedFramePath}`)} // Basic error handling
                             />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No frame selected.</div>
                          )}
                        </div>

                        {/* Corresponding Trailer Image Display */}
                        <div className="relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border">
                           {trailerImagePath ? (
                             <Image
                               key={trailerImagePath} // Ensure re-render on change
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
                     <DialogFooter className="mt-4">
                         <Button type="button" variant="outline" onClick={() => setIsFrameModalOpen(false)}>Close</Button>
                     </DialogFooter>
                   </DialogContent>
                </Dialog>

              {/* IMDB Link Section */}
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

              {/* Color Palette Section */}
               <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                  <CardHeader className="p-4 border-b border-border bg-muted/40">
                    <CardTitle className="text-xl font-semibold text-center text-foreground">Color Palette for {selectedMovieData.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                     {selectedMovieData.palettePath && !paletteImageError && (
                         <div className="mb-6 flex justify-center">
                             <Image
                                key={`palette-${selectedMovieId}`} // Add key for potential re-renders
                                src={selectedMovieData.palettePath}
                                alt={`Visual color palette representation for ${selectedMovieData.name}`}
                                width={800} // Adjust width as needed
                                height={60} // Adjust height as needed
                                className="rounded border border-muted shadow-inner object-contain w-full max-w-lg" // Use object-contain
                                priority // Load palette image sooner
                                onError={handlePaletteImageError}
                             />
                         </div>
                     )}
                     {paletteImageError && (
                        <div className="mb-6 flex justify-center items-center p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-md text-sm">
                            <AlertCircle className="h-5 w-5 mr-2"/>
                            Could not load the color palette image. Please ensure the file exists at {selectedMovieData.palettePath}.
                        </div>
                     )}

                      {/* Frames by Color Section */}
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
                                        {/* Color Selector Buttons */}
                                        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6">
                                            {colorFolders.map((folderName) => (
                                                <Button
                                                key={folderName}
                                                variant={selectedColor === folderName ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedColor(folderName)}
                                                className={`border hover:border-foreground transition-colors duration-150 rounded-md shadow-sm ${selectedColor !== folderName ? 'text-white' : ''}`} // Use white text on colored background
                                                style={{ backgroundColor: selectedColor === folderName ? undefined : folderName }} // Apply background color directly
                                                aria-pressed={selectedColor === folderName}
                                                >
                                                {folderName}
                                                </Button>
                                            ))}
                                        </div>

                                        {/* Frame Grid */}
                                        {selectedColor && (
                                            isLoadingFrameFiles[selectedColor] ? (
                                                 <div className="flex justify-center items-center p-6">
                                                     <Loader2 className="h-5 w-5 animate-spin text-primary"/>
                                                     <span className="ml-2 text-muted-foreground text-sm">Loading frames for {selectedColor}...</span>
                                                 </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                                                {(frameFiles[selectedColor] && frameFiles[selectedColor].length > 0) ? (
                                                    frameFiles[selectedColor].map((file) => {
                                                        if(!selectedMovieId || !selectedColor) return null;
                                                        const framePath = `/frames/${selectedMovieId}/${selectedColor}/${file}`;
                                                        const hasError = frameErrors[selectedColor]?.[file] ?? false;

                                                        return (
                                                           <div
                                                              key={file}
                                                              className={`relative aspect-video w-full bg-muted rounded overflow-hidden shadow-inner border border-border group ${hasError ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all'}`}
                                                              onClick={() => !hasError && handleFrameClick(file)}
                                                              role="button"
                                                              tabIndex={0} // Make it focusable
                                                              aria-label={`View frame ${file}`}
                                                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { !hasError && handleFrameClick(file); }}} // Keyboard accessibility
                                                            >
                                                                 {!hasError ? (
                                                                    <Image
                                                                        src={framePath}
                                                                        alt={`Frame ${file} highlighting color ${selectedColor} from ${selectedMovieData.name}`}
                                                                        fill // Use fill for responsive images
                                                                        className="object-cover transition-transform duration-200 group-hover:scale-105" // Subtle hover effect
                                                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" // Optimize image loading
                                                                        onError={() => handleFrameImageError(selectedColor, file)}
                                                                        priority={false} // Only prioritize above-the-fold images
                                                                     />
                                                                 ) : (
                                                                     <div className="flex items-center justify-center h-full bg-destructive/10">
                                                                        <AlertCircle className="h-6 w-6 text-destructive" />
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
                                        )
                                      )}
                                     </>
                                ) : (
                                    <p className="text-center text-muted-foreground p-6">No representative frames found for this movie.</p>
                                )}
                           </CardContent>
                       </Card>
                  </CardContent>
               </Card>

           </Fragment>
          ) : !error && !selectedMovieId ? (
            // Initial state message
            <div className="text-center py-10 text-muted-foreground">
                 <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                 <p>Enter a movie ID above to begin exploring.</p>
            </div>
          ) : null // Render nothing if error exists but no movie data (error is shown above)
          }
        </CardContent>
      </Card>
    </div>
  );
};

    