const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function debugBookings() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Fetching bookings...');
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, limit(5));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.docs.length} bookings:`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Booking ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('All fields:', Object.keys(data));
      console.log('Full data:', JSON.stringify(data, null, 2));
    });
    
    // Show just the first booking in detail
    if (snapshot.docs.length > 0) {
      const firstBooking = snapshot.docs[0].data();
      console.log('\n=== FIRST BOOKING DETAILED ===');
      console.log(JSON.stringify(firstBooking, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBookings();