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

// Check critical environment variables
const criticalVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

console.log('=== CHECKING CRITICAL ENVIRONMENT VARIABLES ===\n');

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '' && !value.includes('your-') && !value.includes('placeholder')) {
    console.log(`✅ ${varName}: CONFIGURED`);
  } else {
    console.log(`❌ ${varName}: NOT SET OR PLACEHOLDER`);
    if (value) {
      console.log(`   Current value: ${value.substring(0, 20)}...`);
    }
  }
});

console.log('\n=== SUMMARY ===');
const configuredCount = criticalVars.filter(varName => {
  const value = process.env[varName];
  return value && value.trim() !== '' && !value.includes('your-') && !value.includes('placeholder');
}).length;

console.log(`Configured: ${configuredCount}/${criticalVars.length}`);
if (configuredCount === criticalVars.length) {
  console.log('🎉 All critical variables are properly configured!');
  process.exit(0);
} else {
  console.log('⚠️  Some critical variables need attention.');
  process.exit(1);
}