'use client';



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
import { explainColorPalette, type ExplainColorPaletteOutput } from '@/ai/flows/explain-color-palette';
import { Info, Loader2, Search, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';
import { getColorFrameFolders, type GetColorFrameFoldersOutput } from '@/actions/get-color-frames';
import { getColorAtPixel, hexToHsv } from '@/lib/color-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FrameFilesApiOutput } from '@/app/api/frame-files/route';
import type { TrailerFileApiOutput } from '@/app/api/trailer-file/route';
import Link from "next/link";
import { MovieListDialog } from "@/components/movie-list-dialog";
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
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<Record<string, boolean>>({});
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
    const [isOpen, setIsOpen] = useState(false);
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
    event?.preventDefault(); // Prevent default form submission if called from form
    console.log("handleMovieSelect called");
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
      setColorExplanations({});
      setIsLoadingExplanation({});
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
    setIsOpen(true); // Open the movie list dialog
  };

  const handleCancelBrowse = () => {
    setIsBrowsing(false);
    setInputValue('');
    setIsOpen(false); // Close the movie list dialog

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
      if (selectedMovieData && selectedMovieData.palettePath) {
        console.error('Error loading palette image:', selectedMovieData.palettePath, e);
        setPaletteImageError(true);
         setError(`Failed to load palette image: ${selectedMovieData.palettePath}. Check if the file exists in the public/palettes folder.`);
      } else {
         console.error('Error loading palette image, but selectedMovieData or palettePath is missing:', e);
          setPaletteImageError(true);
          setError('Failed to load palette image. Movie data might be incomplete.');
      }
  };

  // Handle clicks on the color palette image
  const handlePaletteClick = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    if (!selectedMovieData?.palettePath || paletteImageError) return; // Don't process clicks if image failed to load
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
       // Optionally, provide feedback to the user or just ignore
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
    // Adjusted to handle single range groups correctly
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
        // Optionally provide feedback: `Frames for color ${foundColor} are not available.`
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
                setInputValue('');
                setError(null);
                setIsMovieSelected(false);
                 setSelectedColor(null);
                  setPaletteImageError(false);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center relative">

       <Card className="w-full max-w-4xl shadow-xl mb-8 bg-card text-card-foreground rounded-lg overflow-hidden border border-border">
        <CardHeader className="bg-muted/40 p-4 border-b border-border">
          <Link href="/" onClick={handleBackToHomePage} className="block">
          <CardTitle className="text-4xl font-bold text-center text-primary font-jetbrains-mono cursor-pointer">RefinedPalette</CardTitle>
          </Link>
          <p className="text-center text-muted-foreground">Your mood. Your movie.</p>
           {/* <CardDescription className="text-center text-muted-foreground">Enter a movie's IMDb ID (e.g., tt0111161) or name to explore its visual identity.</CardDescription> */}
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
         {/* Input Form - Conditionally Render or Keep Always Visible */}
          <div className='w-full'>
            <div className="search-box-container w-full flex flex-col items-center mt-4">
            <form onSubmit={handleMovieSelect} className="flex items-center gap-3 w-full">
              <Label htmlFor="movie-id-input" className="sr-only">Movie ID or Name:</Label>
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Optionally clear error when user starts typing
                  if (error) setError(null);
                }}
                placeholder="Search"
                aria-label="Enter Movie IMDb ID or Name"
                className={cn(isBrowsing && "bg-muted/50 w-full")} // Keep styling if needed
              />
              <Button type="submit" aria-label="Load Movie Palette">
                <Search className="mr-2 h-4 w-4" /> Load Palette
              </Button>
            </form>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {/* Movie List Dialog */}
          <MovieListDialog
                isOpen={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) {
                        setIsBrowsing(false); // Ensure browsing state is reset if dialog is closed externally
                    }
                }}
                handleMovieTitleClick={handleMovieTitleClick}
            />

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
                <div className="w-full aspect-video rounded-lg overflow-hidden shadow-md bg-muted border border-border">
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
                {/* Color Palette Section */}
               <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                  <CardHeader className="p-4 border-b border-border bg-muted/40">
                    <CardTitle className="text-xl font-semibold text-center text-foreground">Color Palette for {selectedMovieData.name}</CardTitle>
                      <CardDescription className="text-center text-muted-foreground text-sm">Click on the palette to select a color category.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                     {selectedMovieData.palettePath && !paletteImageError && (
                         <div className="mb-6 flex justify-center cursor-pointer" onClick={handlePaletteClick} title="Click to select a color category">
                             <Image
                                key={`palette-${selectedMovieId}`} // Add key for potential re-renders
                                src={selectedMovieData.palettePath}
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
                       <Card className="mt-6 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                            <CardHeader className="p-4 border-b border-border bg-muted/40">
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
                  </CardContent>
               </Card>
           </>
          ) : !error && !selectedMovieId && !isBrowsing ? (
            // Initial state message (not browsing)
           <> <div className="text-center py-4 text-muted-foreground">
                 {/* <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" /> */}
                 <p>Enter a movie ID or name above, or browse the list.</p>
            </div>
           </>
          ) : null // Render nothing if error exists or browsing (components handle those states)
          }
          
            {!error && !selectedMovieId && !isBrowsing && (
                 <div className='w-full flex flex-col items-center'>
                    {/* Browse Button */}
                    <Button type="button" variant="outline" onClick={handleBrowseClick} aria-label="Browse movies" className="mt-2">
                         Browse
                     </Button>
                     
                </div>
            )}

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
           )
          }
        </CardContent>
      </Card>
    </div>
  );
};
const allMovies: MoviePaletteDataWithId[] = getAllMoviePalettes().map(movie => ({
  ...movie,
  id: movie.id, // Ensure the id field is explicitly included
}));

