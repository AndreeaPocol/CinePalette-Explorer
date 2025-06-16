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
  color: z.string().describe('The specific color in the palette (e.g., #RRGGBB).'),
});
export type ExplainColorPaletteInput = z.infer<typeof ExplainColorPaletteInputSchema>;

const ExplainColorPaletteOutputSchema = z.object({
  explanation: z.string().describe('The explanation of why the color is in the movie palette.'),
});
export type ExplainColorPaletteOutput = z.infer<typeof ExplainColorPaletteOutputSchema>;

export async function explainColorPalette(input: ExplainColorPaletteInput): Promise<ExplainColorPaletteOutput> {
  return explainColorPaletteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainColorPalettePrompt',
  input: {
    schema: z.object({
      movieId: z.string().describe('The ID of the movie.'),
      color: z.string().describe('The specific color in the palette (e.g., #RRGGBB).'),
    }),
  },
  output: {
    schema: z.object({
      explanation: z.string().describe('The explanation of why the color is in the movie palette.'),
    }),
  },
  prompt: `You are a movie visual analysis expert.

  You are analyzing the movie with ID {{{movieId}}}.

  Explain why the color {{{color}}} is present in the color palette for this movie.  Reference specific scenes, themes, or artistic choices in the movie to justify your explanation.
  `,
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
    return output!;
  }
);
