
'use client';

import type React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { getAllMoviePalettes, type MoviePaletteData } from '@/data/movie-palettes';
import { cn } from '@/lib/utils';

interface MovieListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleMovieTitleClick: (movieName: string) => void;
}

// Fetch all movies once when the component module loads
const allMovies: MoviePaletteData[] = getAllMoviePalettes();

export const MovieListDialog: React.FC<MovieListDialogProps> = ({
  isOpen,
  onOpenChange,
  handleMovieTitleClick,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border border-border">
        <DialogHeader>
          <DialogTitle>Browse Movies</DialogTitle>
          <DialogDescription>
            Select a movie from the list below to explore its palette.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border border-border p-4">
          <div className="space-y-2">
            {allMovies.length > 0 ? (
              allMovies.map((movie) => (
                <Button
                  key={movie.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleMovieTitleClick(movie.name)}
                >
                  {movie.name} ({movie.id})
                </Button>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No movies found.</p>
            )}
          </div>
        </ScrollArea>
        {/* Optional: Add a close button if needed, though clicking outside or Esc usually works */}
        {/* <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
};
