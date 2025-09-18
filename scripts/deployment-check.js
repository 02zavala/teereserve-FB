#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script performs comprehensive checks before deployment to ensure
 * the application is ready for production.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

class DeploymentChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
    this.projectRoot = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addCheck(name, status, message) {
    this.checks.push({ name, status, message });
    
    if (status === 'error') {
      this.errors.push(message);
      this.log(`${name}: ${message}`, 'error');
    } else if (status === 'warning') {
      this.warnings.push(message);
      this.log(`${name}: ${message}`, 'warning');
    } else {
      this.log(`${name}: ${message}`, 'success');
    }
  }

  // Check if required files exist
  checkRequiredFiles() {
    this.log('Checking required files...', 'info');
    
    const requiredFiles = [
      'package.json',
      'next.config.mjs',
      '.env.example',
      'src/app/layout.tsx',
      'src/lib/firebase.ts',
      'src/lib/logger.ts',
      'src/lib/error-handler.ts',
      'sentry.client.config.ts',
      'sentry.server.config.ts',
      'sentry.edge.config.ts'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.addCheck('Required Files', 'success', `${file} exists`);
      } else {
        this.addCheck('Required Files', 'error', `Missing required file: ${file}`);
      }
    });
  }

  // Check environment variables
  checkEnvironmentVariables() {
    this.log('Checking environment variables...', 'info');
    
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    const envLocalPath = path.join(this.projectRoot, '.env.local');
    
    if (!fs.existsSync(envExamplePath)) {
      this.addCheck('Environment', 'error', '.env.example file not found');
      return;
    }

    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = envExample
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0]);

    if (fs.existsSync(envLocalPath)) {
      const envLocal = fs.readFileSync(envLocalPath, 'utf8');
      const localVars = envLocal
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => line.split('=')[0]);

      requiredVars.forEach(varName => {
        if (localVars.includes(varName)) {
          this.addCheck('Environment', 'success', `${varName} is configured`);
        } else {
          this.addCheck('Environment', 'warning', `${varName} not found in .env.local`);
        }
      });
    } else {
      this.addCheck('Environment', 'warning', '.env.local file not found - using system environment variables');
    }

    // Check critical environment variables
    const criticalVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ];

    criticalVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value.trim() !== '' && !value.includes('your-') && !value.includes('placeholder')) {
        this.addCheck('Critical Env Vars', 'success', `${varName} is set`);
      } else {
        this.addCheck('Critical Env Vars', 'error', `${varName} is not set or contains placeholder value`);
      }
    });
  }

  // Check package.json configuration
  checkPackageJson() {
    this.log('Checking package.json...', 'info');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      this.addCheck('Package.json', 'error', 'package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Check required scripts
    const requiredScripts = ['build', 'start', 'dev'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        this.addCheck('Package Scripts', 'success', `${script} script exists`);
      } else {
        this.addCheck('Package Scripts', 'error', `Missing ${script} script`);
      }
    });

    // Check critical dependencies
    const criticalDeps = [
      'next',
      'react',
      'firebase',
      '@sentry/nextjs'
    ];

    criticalDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        this.addCheck('Dependencies', 'success', `${dep} is installed`);
      } else {
        this.addCheck('Dependencies', 'error', `Missing critical dependency: ${dep}`);
      }
    });
  }

  // Check build process
  checkBuild() {
    this.log('Checking build process...', 'info');
    
    try {
      this.log('Running build check...', 'info');
      execSync('npm run build', { 
        stdio: 'pipe',
        cwd: this.projectRoot,
        timeout: 300000 // 5 minutes timeout
      });
      this.addCheck('Build Process', 'success', 'Build completed successfully');
    } catch (error) {
      this.addCheck('Build Process', 'error', `Build failed: ${error.message}`);
    }
  }

  // Check TypeScript compilation
  checkTypeScript() {
    this.log('Checking TypeScript...', 'info');
    
    try {
      execSync('npx tsc --noEmit', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      this.addCheck('TypeScript', 'success', 'TypeScript compilation successful');
    } catch (error) {
      this.addCheck('TypeScript', 'error', `TypeScript errors found: ${error.message}`);
    }
  }

  // Check linting
  checkLinting() {
    this.log('Checking code quality...', 'info');
    
    try {
      execSync('npm run lint', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      this.addCheck('Linting', 'success', 'No linting errors found');
    } catch (error) {
      this.addCheck('Linting', 'warning', `Linting issues found: ${error.message}`);
    }
  }

  // Check security vulnerabilities
  checkSecurity() {
    this.log('Checking security vulnerabilities...', 'info');
    
    try {
      execSync('npm audit --audit-level=high', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      this.addCheck('Security', 'success', 'No high-severity vulnerabilities found');
    } catch (error) {
      this.addCheck('Security', 'warning', 'Security vulnerabilities detected - run npm audit for details');
    }
  }

  // Check Firebase configuration
  checkFirebaseConfig() {
    this.log('Checking Firebase configuration...', 'info');
    
    const firebaseConfigPath = path.join(this.projectRoot, 'src/lib/firebase.ts');
    
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = fs.readFileSync(firebaseConfigPath, 'utf8');
      
      if (firebaseConfig.includes('your-project-id')) {
        this.addCheck('Firebase Config', 'error', 'Firebase configuration contains placeholder values');
      } else {
        this.addCheck('Firebase Config', 'success', 'Firebase configuration appears to be properly set');
      }
    } else {
      this.addCheck('Firebase Config', 'error', 'Firebase configuration file not found');
    }
  }

  // Check Sentry configuration
  checkSentryConfig() {
    this.log('Checking Sentry configuration...', 'info');
    
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    if (sentryDsn && sentryDsn !== 'https://xxx@xxx.ingest.sentry.io/xxx') {
      this.addCheck('Sentry Config', 'success', 'Sentry DSN is configured');
    } else {
      this.addCheck('Sentry Config', 'warning', 'Sentry DSN not configured - error tracking will be disabled');
    }
  }

  // Generate deployment report
  generateReport() {
    this.log('\n=== DEPLOYMENT VERIFICATION REPORT ===', 'info');
    
    const totalChecks = this.checks.length;
    const successCount = this.checks.filter(c => c.status === 'success').length;
    const warningCount = this.warnings.length;
    const errorCount = this.errors.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Checks: ${totalChecks}`);
    console.log(`   ✅ Passed: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (this.errors.length > 0) {
      console.log(`\n❌ Critical Issues (Must Fix):`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (Recommended to Fix):`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Deployment readiness assessment
    console.log(`\n🚀 Deployment Readiness:`);
    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        console.log(`   ✅ READY FOR PRODUCTION - All checks passed!`);
        return true;
      } else {
        console.log(`   ⚠️  READY WITH WARNINGS - Consider fixing warnings before deployment`);
        return true;
      }
    } else {
      console.log(`   ❌ NOT READY - Fix critical errors before deployment`);
      return false;
    }
  }

  // Run all checks
  async runAllChecks() {
    this.log('Starting deployment verification...', 'info');
    
    this.checkRequiredFiles();
    this.checkEnvironmentVariables();
    this.checkPackageJson();
    this.checkFirebaseConfig();
    this.checkSentryConfig();
    this.checkTypeScript();
    this.checkLinting();
    this.checkSecurity();
    
    // Build check is optional and can be time-consuming
    if (process.argv.includes('--build')) {
      this.checkBuild();
    } else {
      this.log('Skipping build check (use --build flag to include)', 'info');
    }

    return this.generateReport();
  }
}

// Run the deployment checker
if (require.main === module) {
  const checker = new DeploymentChecker();
  
  checker.runAllChecks()
    .then(isReady => {
      process.exit(isReady ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Deployment check failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentChecker;