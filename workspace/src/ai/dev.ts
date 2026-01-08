import { config } from 'dotenv';
config();

import '@/ai/flows/generate-course-descriptions.ts';
import '@/ai/flows/recommend-golf-courses.ts';
import '@/ai/flows/assist-review-moderation.ts';
import '@/ai/flows/create-payment-intent.ts';
import '@/ai/flows/send-contact-email.ts';
import '@/ai/flows/send-booking-confirmation-email.ts';
