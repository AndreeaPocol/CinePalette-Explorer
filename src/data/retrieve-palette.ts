/**
 * Interface representing a single color entry in a movie palette.
 */
export interface ColorProportion {
    r: number;
    g: number;
    b: number;
    proportion: number;
}

const DATA_FILE_PATH = '/all_palettes_numerical_data.txt';


/**
 * Service class to manage the parsing, storage, and retrieval of movie color palettes.
 * This class ensures the data is parsed only once upon application startup.
 */
export class PaletteService {
    // Stores the parsed data: Map<tconst (string), ColorProportion[] (array of palettes)>
    private moviePalettes: Map<string, ColorProportion[]> = new Map();
    private isInitialized: boolean = false;

    /**
     * Parses the raw text content of the palette file and loads it into the internal Map structure.
     * This function should be called only once during application initialization.
     * @param fileContent The entire content of the palette text file as a string.
     */
    public initializePaletteData(fileContent: string): void {
        if (this.isInitialized) {
            console.warn("PaletteService is already initialized. Skipping re-initialization.");
            return;
        }
        
        const lines = fileContent.split('\n');
        let currentTconst: string | null = null;
        let lineCount = 0;

        for (const line of lines) {
            lineCount++;
            const trimmedLine = line.trim().toLowerCase(); // Normalize for case-insensitive tconst matching
            
            if (trimmedLine.length === 0) {
                continue; // Skip empty lines
            }

            // Check if the line is a new tconst (Movie ID)
            if (trimmedLine.startsWith('tt')) {
                currentTconst = trimmedLine;
                this.moviePalettes.set(currentTconst, []);
            } 
            // Check if the line is a color entry
            else if (currentTconst && trimmedLine.includes(',') && trimmedLine.includes(':')) {
                try {
                    // Example format: 181,73,72:0.180200
                    const [rgbPart, proportionPart] = trimmedLine.split(':');
                    const [rStr, gStr, bStr] = rgbPart.split(',');

                    const paletteEntry: ColorProportion = {
                        // Use parseInt with radix 10 for safety
                        r: parseInt(rStr, 10),
                        g: parseInt(gStr, 10),
                        b: parseInt(bStr, 10),
                        // Use parseFloat for proportion
                        proportion: parseFloat(proportionPart),
                    };

                    // Add the palette entry to the current movie's list
                    this.moviePalettes.get(currentTconst)?.push(paletteEntry);

                } catch (error) {
                    // Log and ignore corrupted lines
                    console.error(`Error parsing line ${lineCount} for ${currentTconst}: "${trimmedLine}"`, error);
                }
            }
        }
        
        this.isInitialized = true;
        console.log(`PaletteService initialized with ${this.moviePalettes.size} movies.`);
    }

    /**
     * Retrieves the palette for a specific movie ID. This is a fast, synchronous lookup.
     * @param tconst The IMDb tconst ID (e.g., 'tt1032821') to find.
     * @returns An array of ColorProportion objects for the specified movie, or an empty array if not found.
     */
    public getPaletteByTconst(tconst: string): ColorProportion[] {
        if (!this.isInitialized) {
            console.error("PaletteService not initialized. Call initializePaletteData first.");
            return [];
        }
        // Normalize the tconst to ensure lookup consistency (Map keys are lowercase)
        return this.moviePalettes.get(tconst.toLowerCase()) || [];
    }

    /**
     * Returns the total number of movies currently loaded in the palette map.
     */
    public getTotalMovieCount(): number {
        return this.moviePalettes.size;
    }

    /**
     * Async wrapper for initializePaletteData()
     */
    public async loadPalettes(): Promise<void> {
        try {
            // Step A: Call your asynchronous loading function
            const response = await fetch(DATA_FILE_PATH);
    
            // Check if the response was successful (status code 200-299)
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`Failed to load data file: ${response.statusText}`);
            }
    
            // Return the raw text content of the file
            const rawText = await response.text();
    
            // Step B: Initialize the singleton service with the loaded data
            if (rawText) {
                this.initializePaletteData(rawText);
                console.log("Movie palette data successfully initialized.");
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            // TODO: might want to handle this error state in the UI
        }
    }
}