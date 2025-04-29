
"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import type { ReactElement, SyntheticEvent, ReactNode } from 'react';
import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMoviePaletteById, getAllMoviePalettes, type MoviePaletteData, type MoviePaletteDataWithId } from '@/data/movie-palettes';
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2, Search, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';
import { getColorFrameFolders, type GetColorFrameFoldersOutput } from '@/actions/get-color-frames';
import { getColorAtPixel, hexToHsv } from '@/lib/color-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FrameFilesApiOutput } from '@/app/api/frame-files/route';
import { TrailerFileApiOutput } from '@/app/api/trailer-file/route';
import Link from "next/link";
import { ArrowLeft, ArrowUp } from 'lucide-react';


type MoviePaletteDataWithId = MoviePaletteData & { id: string }; 
type ColorExplanations = Record<string, string | null | 'loading' | 'error'>;
type FrameErrorState = Record<string, boolean>;
type FrameFiles = Record<string, string[]>; // Stores filenames for each color
export default function CinePaletteExplorer(): ReactElement {
  const [isFrameModalOpen, setIsFrameModalOpen] = useState<boolean>(false); // State to control the visibility of the frame modal
  const [inputValue, setInputValue] = useState<string>(''); // State to hold the user's input for movie ID or name
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false); // State to indicate if the user is browsing movies
  const [isMovieSelected, setIsMovieSelected] = useState<boolean>(false); // State to indicate if a movie is selected

  const [selectedMovieId, setSelectedMovieId] = useState<string>(''); // State to store the selected movie's ID
  const [selectedMovieData, setSelectedMovieData] = useState<MoviePaletteData | null>(null); // State to store the data of the selected movie
  const [colorExplanations, setColorExplanations] = useState<ColorExplanations>({}); // State to store color explanations
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({}); // State to track loading status of color explanations
  const paletteImageRef = useRef<HTMLImageElement>(null); // Ref to the palette image element
  const [error, setError] = useState<string | null>(null); // State to store error messages
  const [colorFolders, setColorFolders] = useState<string[]>([]); // State to store the list of color folders for the selected movie
  
  const [selectedFramePath, setSelectedFramePath] = useState<string | null>(null); // State to store the path of the selected frame for display in the modal
  const [trailerImagePath, setTrailerImagePath] = useState<string | null>(null); // State to store the path of the trailer image for display in the modal
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false); // State to track loading status of color folders

    const [selectedColor, setSelectedColor] = useState<string | null>(null); // State to store the currently selected color folder
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({}); // State to manage the open/close state of tooltips for each color
  const [paletteImageError, setPaletteImageError] = useState<boolean>(false); // State to track if there's an error loading the palette image
  const [frameErrors, setFrameErrors] = useState<Record<string, Record<string, boolean>>>({}); // State to track loading errors for each frame
  const [frameFiles, setFrameFiles] = useState<FrameFiles>({}); // State to store the filenames of frames for each color
  const [isLoadingFrameFiles, setIsLoadingFrameFiles] = useState<Record<string, boolean>>({}); // State to track loading status of frames for each color
  const [showBackToTop, setShowBackToTop] = useState(false);

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
          setColorExplanations({});
        setIsLoadingExplanation({});
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

      } else {
        setSelectedMovieData(null);
        setError(`Data inconsistency: Could not find data for valid ID ${selectedMovieId}.`);
        setColorExplanations({});
        setIsLoadingExplanation({});
        setIsMovieSelected(false);

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
    console.log("handleMovieSelect called");
    if (isMovieSelected) return;
    event?.preventDefault();
    const trimmedInput = inputValue.trim(); // Trim whitespace from the input value

    if (!trimmedInput) {
      setError("Please enter a movie ID or name.");      
      return;
    }

    const movieData = getMoviePaletteById(trimmedInput.toLowerCase());

    if (movieData) {
      setSelectedMovieId(movieData.id);
      setError(null); // Clear any previous errors
      setIsMovieSelected(true);
    } else {
      setError(`Movie "${trimmedInput}" not found in our data. Please check the ID or name and try again.`);
    }
  };

  const handleBrowseClick = () => {
    setIsBrowsing(true);
      setError(null);
  };

  const handleCancelBrowse = () => {  
    setIsBrowsing(false);    
    setInputValue('');
      setSelectedMovieId('');
      setSelectedMovieData(null);
      setError(null);
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

  // Handle clicks on the color palette image
  const handlePaletteClick = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    if (!selectedMovieData?.palettePath) return;
    const img = paletteImageRef.current;
    if (!img) return;
        const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;    

    const colorHex = getColorAtPixel(img, x, y);    

    const hsv = hexToHsv(colorHex);

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
    const isWithinRange = (hsvValue: number, sValue: number, vValue: number, range: [number, number, number][]): boolean => {
      const [min, max] = range;
      const [minH, minS, minV] = min;
      const [maxH, maxS, maxV] = max;

      return hsvValue >= minH && hsvValue <= maxH && sValue >= minS && sValue <= maxS && vValue >= minV && vValue <= maxV;
    };

    // Check the color in the map
    for (const colorName in hsvToColorMap) {
      const ranges = hsvToColorMap[colorName];
      let colorMatch = false;
      
      for (const rangeGroup of ranges) {
          if (rangeGroup.length === 2) {
              if (isWithinRange(hsv.h, hsv.s, hsv.v, rangeGroup)) {
                colorMatch = true;
                  break;
              }
          } else if(rangeGroup.length === 1) {
            if (isWithinRange(hsv.h, hsv.s, hsv.v, rangeGroup)) {
              colorMatch = true;
                break;
            }
          }
      }

      if (colorMatch) {
        foundColor = colorName;
        break;
      }
    }

    if (foundColor && colorFolders.includes(foundColor)) {
      setSelectedColor(foundColor);
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
      const response = await fetch(`/api/trailer-file?movieId=${selectedMovieId}&frameFile=${frameFile}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data: TrailerFileApiOutput = await response.json();

      if (data.success && data.trailer) {
        // Construct the full path for the trailer image
        setTrailerImagePath(data.trailer);
      } else if (!data.success) {
          console.error("Error fetching trailer file info:", data.error);
      } else {
         console.log(`No corresponding trailer file found for frame: ${data.trailer}`);
      }
    } catch (error) {
       console.error("Error calling trailer API:", error);
    }

    setIsFrameModalOpen(true); // Open the modal
  };

  const handleMovieTitleClick = (movieName: string) => {
      const movie = allMovies.find(m => m.name === movieName);
      if(movie) {
          setIsBrowsing(false);
        setSelectedMovieId(movie.id);
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center">
       <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className="bg-muted/40 p-4 border-b border-border"> 
          <CardTitle className="text-2xl font-bold text-center text-primary">CinePalette Explorer</CardTitle>
           <CardDescription className="text-center text-muted-foreground">Enter a movie's IMDb ID (e.g., tt0111161) to explore its visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
         {(!isBrowsing || (!selectedMovieId && isBrowsing)) && ( <form onSubmit={handleMovieSelect} className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
            <Label htmlFor="movie-id-input" className="sr-only">Movie ID:</Label>
            <Input
              id="movie-id-input"
              type="text"
              value={inputValue}
              onChange={(e) => {                
                setInputValue(e.target.value);
              }}
              placeholder="Enter IMDb ID or name (e.g., tt0111161, Avatar)"
                isBrowsing={isBrowsing}
            />
            <Button type="submit" aria-label="Load Movie Palette">
              <Search className="mr-2 h-4 w-4" /> Load Palette
            </Button> 
          </form> )}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
            {!selectedMovieData && !isBrowsing && !error && (
                 <p className="mt-4 text-center text-muted-foreground">Or, would you like to <Link href="#" className="font-medium underline underline-offset-4 hover:text-primary" onClick={handleBrowseClick}>browse</Link> a list of movies?</p>
             )}

          {selectedMovieData ? (
             <>
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
                     <DialogFooter className="mt-4" >
                       <Button variant="outline" onClick={() => setIsFrameModalOpen(false)}>Close</Button>
                     </DialogFooter>
                   </DialogContent>
                </Dialog>

                {/* YouTube Video Section */}
                <div className="w-full aspect-video rounded-lg overflow-hidden shadow-md bg-muted border border-border">
                    {selectedMovieData.youtubeKey ? (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${selectedMovieData.youtubeKey}`}
                            title={`${selectedMovieData.name} Trailer`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                           <p className="text-center">Youtube trailer not found for this movie</p>
                        </div>
                    )}
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
                                priority
                                ref={paletteImageRef}
                                onError={handlePaletteImageError}
                                onClick={handlePaletteClick}
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
                                                              aria-label={`View frame ${file}`} // Make it keyboard accessible
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
           </>
          ) : !error && !selectedMovieId ? (
            // Initial state message
          <>{isBrowsing && !selectedMovieData && (
                <div className="w-full mt-6">
                    <Card className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <CardHeader className="p-4 border-b border-border bg-muted/40 relative">
                            <CardTitle className="text-xl font-semibold text-center text-foreground">Browse Available Movies</CardTitle>
                            <div className="absolute top-2 right-2">
                                <Button type="button" variant="outline" onClick={handleCancelBrowse} aria-label="Cancel Browsing"><X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>                       
                        <CardContent className="p-4 md:p-6 max-h-[300px] overflow-y-auto">
                            <ul className="list-none p-0">
                                {allMovies.map((movie) => (
                                    <li key={movie.id} className="hover:bg-muted/50 rounded p-2 cursor-pointer" onClick={() => handleMovieTitleClick(movie.name)}>
                                        {movie.name}
                                    </li> ))}
                            </ul>
                        </CardContent>                        
                    </Card>
                </div>
            )} <div className="text-center py-10 text-muted-foreground"> 
                 <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                 <p>Enter a movie ID above to begin exploring.</p>
            </div>
           </>
          ) : null // Render nothing if error exists but no movie data (error is shown above)
          }
        </CardContent>
      </Card>
    </div>
  );
};
const allMovies: MoviePaletteDataWithId[] = getAllMoviePalettes().map(movie => ({
  ...movie,
  id: movie.id,
}));



