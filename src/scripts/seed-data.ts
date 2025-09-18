import { seedReviews } from '../lib/seed-reviews';

// Script to seed the database with sample reviews
async function runSeed() {
  console.log('🌱 Starting database seeding...');
  
  try {
    await seedReviews();
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}

// Run the seed function
runSeed();