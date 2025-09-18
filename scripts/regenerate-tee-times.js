// Simple script to test tee time generation
const { format, addDays } = require('date-fns');

// Generate tee times with exact 10-minute intervals
function generateDefaultTeeTimes(basePrice = 295, course = null, date = null) {
    const times = [];
    const interval = 10; // 10 minutes exact intervals
    const startHour = 7; // 07:00
    const endHour = 18; // 18:00
    
    // Check if this is today's date for auto-blocking past times
    const now = new Date();
    const isToday = date ? date.toDateString() === now.toDateString() : false;
    const nowTimeDecimal = isToday ? now.getHours() + (now.getMinutes() / 60) : 0;
    
    // Start with exact minutes based on interval
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const currentTimeDecimal = hour + (minute / 60);
            
            const priceMultiplier = (hour < 9 || hour >= 15) ? 0.9 : 1.2;
            
            // Auto-block past times if it's today
            const status = isToday && currentTimeDecimal <= nowTimeDecimal ? 'blocked' : 'available';
            
            times.push({
                time: formattedTime,
                status,
                price: Math.round(basePrice * priceMultiplier),
                maxPlayers: 4,
                bookedPlayers: 0,
                availableSpots: 4,
                bookingIds: []
            });
        }
    }
    
    return times;
}

// Test the function
console.log('Testing tee time generation with 10-minute intervals...');
const testDate = new Date();
const testTimes = generateDefaultTeeTimes(295, null, testDate);

console.log('Generated times:');
testTimes.slice(0, 20).forEach(time => {
    console.log(`${time.time} - ${time.status} - $${time.price} - ${time.availableSpots} spots`);
});

console.log(`\nTotal times generated: ${testTimes.length}`);
console.log('\nFirst 10 times:', testTimes.slice(0, 10).map(t => t.time).join(', '));
console.log('\nScript completed successfully!');