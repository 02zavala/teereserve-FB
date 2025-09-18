// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating consistent and engaging descriptions and translations for golf courses using AI.
 *
 * generateCourseDescriptions - A function that generates golf course descriptions and translations.
 * GenerateCourseDescriptionsInput - The input type for the generateCourseDescriptions function.
 * GenerateCourseDescriptionsOutput - The return type for the generateCourseDescriptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCourseDescriptionsInputSchema = z.object({
  name: z.string().describe('The name of the golf course.'),
  location: z.string().describe('The location of the golf course.'),
  description: z.string().describe('A brief description of the golf course.'),
  language: z.enum(['es', 'en']).describe('The language for the description (Spanish or English).'),
});
export type GenerateCourseDescriptionsInput = z.infer<typeof GenerateCourseDescriptionsInputSchema>;

const GenerateCourseDescriptionsOutputSchema = z.object({
  description: z.string().describe('The generated or translated description of the golf course.'),
});
export type GenerateCourseDescriptionsOutput = z.infer<typeof GenerateCourseDescriptionsOutputSchema>;

export async function generateCourseDescriptions(input: GenerateCourseDescriptionsInput): Promise<GenerateCourseDescriptionsOutput> {
  return generateCourseDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCourseDescriptionsPrompt',
  input: {schema: GenerateCourseDescriptionsInputSchema},
  output: {schema: GenerateCourseDescriptionsOutputSchema},
  prompt: `You are an expert copywriter specializing in creating engaging and SEO-optimized descriptions for golf courses.

  Given the following information about a golf course, generate a compelling description in {{language}} that highlights its key features and attracts potential players. The description should have a premium tone.

  Name: {{name}}
  Location: {{location}}
  Existing Description: {{description}}

  Ensure the generated description is SEO-friendly by incorporating relevant keywords related to golf, the course's location, and its unique selling points.`, 
});

const generateCourseDescriptionsFlow = ai.defineFlow(
  {
    name: 'generateCourseDescriptionsFlow',
    inputSchema: GenerateCourseDescriptionsInputSchema,
    outputSchema: GenerateCourseDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
