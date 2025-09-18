const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
  authDomain: "teereserve-fire.firebaseapp.com",
  projectId: "teereserve-fire",
  storageBucket: "teereserve-fire.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function similar to getBookingByIdAndLastName
async function testBookingSearch() {
  try {
    console.log('Testing booking search functionality...');
    
    // Get a few bookings to test with
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    if (snapshot.empty) {
      console.log('No bookings found');
      return;
    }
    
    // Test with the first few bookings
    const testBookings = snapshot.docs.slice(0, 3);
    
    for (const bookingDoc of testBookings) {
      const booking = { id: bookingDoc.id, ...bookingDoc.data() };
      console.log(`\n--- Testing Booking ${booking.id} ---`);
      console.log('User ID:', booking.userId);
      console.log('Is Guest:', booking.isGuest);
      console.log('Guest Object:', booking.guest ? 'Present' : 'Missing');
      console.log('User Email:', booking.userEmail);
      
      // Simulate the email verification logic
      let bookingEmail;
      
      if (booking.isGuest && booking.guest?.email) {
        bookingEmail = booking.guest.email;
        console.log('✅ Email found in guest object:', bookingEmail);
      } else if (booking.userId === 'guest') {
        if (booking.userEmail) {
          bookingEmail = booking.userEmail;
          console.log('✅ Email found in userEmail field:', bookingEmail);
        } else {
          console.log('❌ Guest booking but no email found');
        }
      } else if (booking.userId && booking.userId !== 'guest') {
        // For registered users, we would normally fetch from users collection
        console.log('📝 Would fetch email from user profile for userId:', booking.userId);
        
        // Try to get user profile
        try {
          const userDocRef = doc(db, 'users', booking.userId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userProfile = userDoc.data();
            bookingEmail = userProfile.email;
            console.log('✅ Email found in user profile:', bookingEmail);
          } else {
            console.log('❌ User profile not found for userId:', booking.userId);
          }
        } catch (error) {
          console.log('❌ Error fetching user profile:', error.message);
        }
      } else {
        console.log('❌ Invalid booking data: missing user information');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBookingSearch();