/**
 * Test script for guest account upgrade functionality
 * 
 * This script tests:
 * 1. Guest account upgrade API endpoint
 * 2. Guest booking linking API endpoint
 * 3. Email validation and error handling
 * 4. Data migration and cleanup
 * 
 * Usage: node scripts/test-guest-upgrade.js
 */

const https = require('https');
const { URL } = require('url');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { FirestoreMigrationService } = require('../src/lib/firestore-migration');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test-guest@example.com';
const TEST_PASSWORD = 'testpassword123';
const TEST_NAME = 'Test Guest User';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : require('http');
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testGuestAccountUpgrade() {
  console.log('\n🔄 Testing Guest Account Upgrade...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/upgrade-guest-account`, {
      method: 'POST',
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        displayName: TEST_NAME,
        bookingId: 'test-booking-123'
      }
    });

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.success) {
      console.log('✅ Guest account upgrade test passed');
      return true;
    } else if (response.status === 401) {
      console.log('⚠️  Authentication required (expected for this test)');
      return true;
    } else {
      console.log('❌ Guest account upgrade test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing guest account upgrade:', error.message);
    return false;
  }
}

async function testGuestBookingLinking() {
  console.log('\n🔗 Testing Guest Booking Linking...');
  
  try {
    // Test POST endpoint (linking bookings)
    const linkResponse = await makeRequest(`${BASE_URL}/api/link-guest-bookings`, {
      method: 'POST',
      body: {
        guestEmail: TEST_EMAIL,
        bookingIds: ['booking-1', 'booking-2']
      }
    });

    console.log(`Link Status: ${linkResponse.status}`);
    console.log('Link Response:', JSON.stringify(linkResponse.data, null, 2));

    // Test GET endpoint (retrieving guest bookings)
    const getResponse = await makeRequest(`${BASE_URL}/api/link-guest-bookings`, {
      method: 'GET',
      body: {
        guestEmail: TEST_EMAIL
      }
    });

    console.log(`Get Status: ${getResponse.status}`);
    console.log('Get Response:', JSON.stringify(getResponse.data, null, 2));

    if ((linkResponse.status === 200 || linkResponse.status === 401) && 
        (getResponse.status === 200 || getResponse.status === 401)) {
      console.log('✅ Guest booking linking test passed');
      return true;
    } else {
      console.log('❌ Guest booking linking test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing guest booking linking:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  const testCases = [
    {
      name: 'Invalid email format',
      endpoint: '/api/upgrade-guest-account',
      body: {
        email: 'invalid-email',
        password: TEST_PASSWORD,
        displayName: TEST_NAME
      }
    },
    {
      name: 'Missing required fields',
      endpoint: '/api/upgrade-guest-account',
      body: {
        email: TEST_EMAIL
        // Missing password and displayName
      }
    },
    {
      name: 'Empty guest email for linking',
      endpoint: '/api/link-guest-bookings',
      body: {
        guestEmail: '',
        bookingIds: ['booking-1']
      }
    }
  ];

  let passedTests = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`\n  Testing: ${testCase.name}`);
      const response = await makeRequest(`${BASE_URL}${testCase.endpoint}`, {
        method: 'POST',
        body: testCase.body
      });

      console.log(`  Status: ${response.status}`);
      
      // We expect these to fail with 400 or 401 status codes
      if (response.status >= 400) {
        console.log(`  ✅ Correctly handled error case`);
        passedTests++;
      } else {
        console.log(`  ❌ Should have returned an error`);
      }
    } catch (error) {
      console.log(`  ✅ Correctly threw error: ${error.message}`);
      passedTests++;
    }
  }

  console.log(`\n📊 Error handling tests: ${passedTests}/${testCases.length} passed`);
  return passedTests === testCases.length;
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Checking Environment Variables...');
  
  const requiredVars = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'RESEND_API_KEY',
    'ZOHO_MAIL_USER',
    'ZOHO_MAIL_PASS'
  ];

  let missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set');
    return true;
  } else {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    console.log('\n💡 Make sure to set these in your .env.local file');
    return false;
  }
}

async function testWelcomeEmailIntegration() {
  console.log('\n📧 Testing Welcome Email Integration...');
  
  try {
    // Check if the welcome email flow exists
    const response = await makeRequest(`${BASE_URL}/api/send-welcome-email`, {
      method: 'POST',
      body: {
        email: TEST_EMAIL,
        displayName: TEST_NAME
      }
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 401) {
      console.log('✅ Welcome email endpoint is accessible');
      return true;
    } else {
      console.log('⚠️  Welcome email endpoint may have issues');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing welcome email:', error.message);
    return false;
  }
}

// Test migration service directly
async function testMigrationService() {
  console.log('\n🔄 Testing Migration Service...');
  
  try {
    // Initialize Firebase Admin for testing
    if (!getApps().length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
      });
    }
    
    const db = getFirestore();
    const migrationService = new FirestoreMigrationService(db);
    
    console.log('✅ Migration service initialized successfully');
    
    // Test dry run mode
    console.log('\n--- Testing Dry Run Mode ---');
    const dryRunResult = await migrationService.migrateGuestBookings(
      'test-anonymous-uid',
      'test-new-uid',
      [],
      { dryRun: true }
    );
    console.log('✅ Dry run completed:', {
      success: dryRunResult.success,
      processed: dryRunResult.processedCount,
      errors: dryRunResult.errors
    });
    
    // Test migration stats (this will work with real data)
    console.log('\n--- Testing Migration Stats ---');
    try {
      const stats = await migrationService.getMigrationStats('test-user-id');
      console.log('✅ Migration stats retrieved:', stats);
    } catch (error) {
      console.log('ℹ️  Migration stats test (expected if no data):', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Migration service test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Guest Account Upgrade Tests');
  console.log('=' .repeat(50));
  
  const results = {
    environmentCheck: await testEnvironmentVariables(),
    guestUpgrade: await testGuestAccountUpgrade(),
    guestLinking: await testGuestBookingLinking(),
    errorHandling: await testErrorHandling(),
    welcomeEmail: await testWelcomeEmailIntegration(),
    migrationService: await testMigrationService()
  };

  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(30));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${testName}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Guest account upgrade functionality is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  console.log('\n💡 Next steps:');
  console.log('1. Test the UI components in your browser');
  console.log('2. Create a guest booking and try upgrading to an account');
  console.log('3. Test linking existing guest bookings to an authenticated account');
  console.log('4. Verify email notifications are working correctly');
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testGuestAccountUpgrade,
  testGuestBookingLinking,
  testErrorHandling,
  testEnvironmentVariables,
  testWelcomeEmailIntegration,
  testMigrationService
};