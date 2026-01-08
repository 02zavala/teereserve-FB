// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview An AI agent to suggest personalized golf courses and packages.
 *
 * - recommendGolfCourses - A function that handles the recommendation process.
 * - RecommendGolfCoursesInput - The input type for the recommendGolfCourses function.
 * - RecommendGolfCoursesOutput - The return type for the recommendGolfCourses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getCourses } from '@/lib/data'; // Import the function to get courses

const RecommendGolfCoursesInputSchema = z.object({
  userId: z.string().describe('The ID of the user for whom to generate recommendations.  If not available, can be an empty string.'),
  courseId: z.string().optional().describe('The ID of the current golf course being viewed, if any.'),
  date: z.string().optional().describe('The date for which the user is planning to play golf.'),
  numPlayers: z.number().optional().describe('The number of players in the user group.'),
  location: z.string().optional().describe('The general location where the user is looking to play golf.'),
});
export type RecommendGolfCoursesInput = z.infer<typeof RecommendGolfCoursesInputSchema>;

const GolfCourseRecommendationSchema = z.object({
  courseId: z.string().describe('The ID of the recommended golf course.'),
  name: z.string().describe('The name of the recommended golf course.'),
  description: z.string().describe('A short, personalized description of why this course is recommended for the user.'),
  price: z.number().describe('The price to play at this golf course.'),
  location: z.string().describe('The location of the recommended course (e.g., "Cabo San Lucas").'),
  imageUrl: z.string().describe("The URL for the course's primary image. This MUST be taken from the provided imageUrl in the available course list."),
  reason: z.string().describe('The reasons this course is recommended to the user, based on their past preferences or current context.'),
  tags: z.array(z.string()).describe("Descriptive tags such as 'best value today' or 'recommended for your style of play'."),
});

const RecommendGolfCoursesOutputSchema = z.object({
  recommendations: z.array(GolfCourseRecommendationSchema).describe('A list of recommended golf courses and packages.'),
});
export type RecommendGolfCoursesOutput = z.infer<typeof RecommendGolfCoursesOutputSchema>;

export async function recommendGolfCourses(input: RecommendGolfCoursesInput): Promise<RecommendGolfCoursesOutput> {
  return recommendGolfCoursesFlow(input);
}

const recommendGolfCoursesFlow = ai.defineFlow(
  {
    name: 'recommendGolfCoursesFlow',
    inputSchema: RecommendGolfCoursesInputSchema,
    outputSchema: RecommendGolfCoursesOutputSchema,
  },
  async (input) => {
    // 1. Fetch the list of available golf courses
    const availableCourses = await getCourses({});
    
    // 2. Prepare the course data for the prompt, including the image URL
    const courseListForPrompt = availableCourses.map(course => ({
      id: course.id,
      name: course.name,
      location: course.location,
      description: course.description.substring(0, 150) + '...', // Keep it brief
      basePrice: course.basePrice,
      imageUrl: course.imageUrls[0] || '', // Provide the primary image URL
    }));

    // 3. Define the prompt with the added context
    const prompt = ai.definePrompt({
      name: 'recommendGolfCoursesPrompt',
      prompt: `You are an expert golf concierge specializing in recommending golf courses and packages to users.

      Based on the user's history, preferences, and current conditions, provide personalized recommendations for golf courses from the list of available courses provided below.

      User Information:
      - User ID: {{{userId}}}
      - Current Course ID (if any): {{{courseId}}}
      - Date: {{{date}}}
      - Number of Players: {{{numPlayers}}}
      - Location: {{{location}}}

      Available Courses (select from this list):
      ${JSON.stringify(courseListForPrompt, null, 2)}

      Recommend 3 courses that match their playing style, budget, and desired experience.
      Do NOT recommend the course if its ID matches the 'Current Course ID'.

      Format your recommendations in JSON format.
      For each recommendation, you MUST use the exact 'imageUrl' provided for that course from the list above. Do not invent or use any other image source.
      Include a personalized description of why each course is recommended for the user.
      The tags are used to highlight reasons or special offers such as "best value today" or "recommended for your style of play".
      `,
      output: { schema: RecommendGolfCoursesOutputSchema },
    });

    // 4. Execute the prompt
    const { output } = await prompt(input);
    
    if (!output) {
        console.error("AI recommendation generation failed to produce output.");
        return { recommendations: [] };
    }

    return output;
  }
);