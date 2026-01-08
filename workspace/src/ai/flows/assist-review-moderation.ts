
'use server';

/**
 * @fileOverview An AI agent to assist in moderating user reviews for spam and toxicity.
 *
 * - assistReviewModeration - A function that handles the review moderation process.
 * - AssistReviewModerationInput - The input type for the assistReviewModeration function.
 * - AssistReviewModerationOutput - The return type for the assistReviewModeration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssistReviewModerationInputSchema = z.object({
  reviewText: z.string().describe('The text content of the user review.'),
});
export type AssistReviewModerationInput = z.infer<typeof AssistReviewModerationInputSchema>;

const AssistReviewModerationOutputSchema = z.object({
  isSpam: z.boolean().describe('Whether the review is likely commercial spam or completely irrelevant.'),
  isToxic: z.boolean().describe('Whether the review contains toxic, hateful, or inappropriate content.'),
  reason: z.string().describe('A brief explanation for the classification if it is spam or toxic.'),
});
export type AssistReviewModerationOutput = z.infer<typeof AssistReviewModerationOutputSchema>;

export async function assistReviewModeration(input: AssistReviewModerationInput): Promise<AssistReviewModerationOutput> {
  return assistReviewModerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assistReviewModerationPrompt',
  input: {schema: AssistReviewModerationInputSchema},
  output: {schema: AssistReviewModerationOutputSchema},
  prompt: `You are an AI assistant helping to moderate user reviews for a golf course booking platform.

  Analyze the following review text for a golf course. Determine if it is spam (e.g., advertising, gibberish, irrelevant) or if it contains toxic content (e.g., hate speech, harassment, profanity).

  If you classify it as spam or toxic, provide a brief, one-sentence reason. If it's a valid review, the reason should be empty.

  Review Text: {{{reviewText}}}

  Return a JSON object with the isSpam, isToxic, and reason fields. Ensure that the output is valid JSON and conforms to the schema.`,
});

const assistReviewModerationFlow = ai.defineFlow(
  {
    name: 'assistReviewModerationFlow',
    inputSchema: AssistReviewModerationInputSchema,
    outputSchema: AssistReviewModerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
