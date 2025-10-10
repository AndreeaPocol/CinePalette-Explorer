'use server';
/**
 * @fileOverview Explains the significance of colors in a movie's color palette.
 *
 * - explainColorPalette - A function that explains the color palette of a movie.
 * - ExplainColorPaletteInput - The input type for the explainColorPalette function.
 * - ExplainColorPaletteOutput - The return type for the explainColorPalette function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExplainColorPaletteInputSchema = z.object({
  movieId: z.string().describe('The ID of the movie.'),
  movieName: z.string().describe('The name of the movie.'),
  color: z.string().describe('The specific color in the palette (e.g., #RRGGBB).'),
});
export type ExplainColorPaletteInput = z.infer<typeof ExplainColorPaletteInputSchema>;

const ExplainColorPaletteOutputSchema = z.object({
  success: z.boolean().describe('Indicates if the explanation was generated successfully.'),
  explanation: z.string().optional().describe('The explanation of why the color is in the movie palette. Present if success is true.'),
  error: z.string().optional().describe('An error message if success is false.'),
  }).refine(data => data.success === (data.explanation !== undefined), { message: "If success is true, explanation must be present. If success is false, explanation must be absent." });
export type ExplainColorPaletteOutput = z.infer<typeof ExplainColorPaletteOutputSchema>;

export async function explainColorPalette(input: ExplainColorPaletteInput): Promise<ExplainColorPaletteOutput> {
  return explainColorPaletteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainColorPalettePrompt',
  input: {
    schema: z.object({
      movieId: z.string().describe('The ID of the movie.'),
      movieName: z.string().describe('The name of the movie.'),
      color: z.string().describe('The specific color in the palette (e.g., #RRGGBB).'),
    }),
  },
  output: {
    schema: z.object({
      success: z.boolean(),
      error: z.string().optional(),
      explanation: z.string().describe('The explanation of why the color is in the movie palette.'),
    }),
  },
  prompt: `You are a movie visual analysis expert.\n\nYou are analyzing the movie named "{{{movieName}}}" with ID {{{movieId}}}.\n\nExplain why the color {{{color}}} is present in the color palette for this movie.  Reference specific scenes, themes, or artistic choices in the movie to justify your explanation.\n`,
});

const explainColorPaletteFlow = ai.defineFlow<
  typeof ExplainColorPaletteInputSchema,
  typeof ExplainColorPaletteOutputSchema
>(
  {
    name: 'explainColorPaletteFlow',
    inputSchema: ExplainColorPaletteInputSchema,
    outputSchema: ExplainColorPaletteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && output.explanation) {
      return { success: true, explanation: output.explanation, error: undefined };
      } else {
      return {
        success: false, error: output?.error || 'No explanation provided by AI.',
        explanation: undefined, // Ensure explanation is explicitly undefined on failure
      };
    }
  }
);