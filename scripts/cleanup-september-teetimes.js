// Script to delete existing tee times for September 17, 2025
// This will force regeneration with new 10-minute intervals

const admin = require('firebase-admin');
const { format } = require('date-fns');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin with environment variables
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('❌ Missing Firebase Admin SDK environment variables');
      console.error('Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local');
      process.exit(1);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function cleanupTeeTimesForDate() {
  try {
    // Target date: September 17, 2025
    const targetDate = new Date(2025, 8, 17); // Month is 0-indexed
    const dateString = format(targetDate, 'yyyy-MM-dd');
    
    console.log(`🧹 Starting cleanup for date: ${dateString}`);
    
    // Get all courses
    const coursesSnapshot = await db.collection('courses').get();
    
    if (coursesSnapshot.empty) {
      console.log('❌ No courses found in database');
      return;
    }
    
    let totalDeleted = 0;
    
    // Process each course
    for (const courseDoc of coursesSnapshot.docs) {
      const courseId = courseDoc.id;
      const courseData = courseDoc.data();
      
      console.log(`\n🏌️ Processing course: ${courseData.name} (${courseId})`);
      
      // Get tee times for the target date
      const teeTimesQuery = db
        .collection('courses')
        .doc(courseId)
        .collection('teeTimes')
        .where('date', '==', dateString);
      
      const teeTimesSnapshot = await teeTimesQuery.get();
      
      if (teeTimesSnapshot.empty) {
        console.log(`   ℹ️  No tee times found for ${dateString}`);
        continue;
      }
      
      console.log(`   📅 Found ${teeTimesSnapshot.size} tee times for ${dateString}`);
      
      // Show sample of existing times to confirm intervals
      const sampleTimes = teeTimesSnapshot.docs.slice(0, 5).map(doc => {
        const data = doc.data();
        return data.time;
      });
      console.log(`   🕐 Sample times: ${sampleTimes.join(', ')}`);
      
      // Delete all tee times for this date
      const batch = db.batch();
      
      teeTimesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      const deletedCount = teeTimesSnapshot.size;
      totalDeleted += deletedCount;
      
      console.log(`   ✅ Deleted ${deletedCount} tee times for ${courseData.name}`);
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total tee times deleted: ${totalDeleted}`);
    console.log(`📅 Date cleaned: ${dateString}`);
    console.log(`\n💡 Next time users visit ${dateString}, new tee times will be generated with current course intervals (10 minutes).`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTeeTimesForDate()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });