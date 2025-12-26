#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key] = value;
      }
    });
  }
}

// Load .env.local file
loadEnvFile(path.join(process.cwd(), '.env.local'));

const criticalVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'GA4_API_SECRET'
];

console.log('=== CHECKING CRITICAL ENVIRONMENT VARIABLES ===\n');

criticalVars.forEach(varName => {
  const value = process.env[varName];
  const bad = !value || /your|placeholder/i.test(value);
  if (!bad) {
    console.log(`✅ ${varName}: CONFIGURED`);
  } else {
    console.log(`❌ ${varName}: NOT SET OR PLACEHOLDER`);
    if (value) {
      console.log(`   Current value: ${value.substring(0, 24)}...`);
    }
  }
});

console.log('\n=== SUMMARY ===');
const configuredCount = criticalVars.filter(varName => {
  const value = process.env[varName];
  return !!value && !/your|placeholder/i.test(value);
}).length;

console.log(`Configured: ${configuredCount}/${criticalVars.length}`);
if (configuredCount === criticalVars.length) {
  console.log('🎉 All critical variables are properly configured!');
  process.exit(0);
} else {
  console.log('⚠️  Some critical variables need attention.');
  process.exit(1);
}
