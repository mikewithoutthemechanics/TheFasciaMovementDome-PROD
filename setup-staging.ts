#!/usr/bin/env tsx
/**
 * Staging Environment Setup Script
 *
 * One-command staging setup that:
 * 1. Checks environment configuration
 * 2. Applies database schema
 * 3. Runs CRUD tests to verify setup
 * 4. Optionally seeds test data
 *
 * Usage:
 *   export NODE_ENV=staging
 *   npx tsx scripts/setup-staging.ts
 *
 * Options:
 *   --skip-tests      Skip running CRUD tests
 *   --skip-seed       Skip seeding test data
 *   --reset           Reset data before seeding
 *   --verbose         Show detailed output
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment
const env = process.env.NODE_ENV || 'staging';
const envFile = `.env.${env}.local`;
const fallbackEnvFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  config({ path: envFile });
  console.log(`[setup] Loaded environment from ${envFile}`);
} else if (fs.existsSync(fallbackEnvFile)) {
  config({ path: fallbackEnvFile });
  console.log(`[setup] Loaded environment from ${fallbackEnvFile}`);
} else {
  config();
  console.log('[setup] Loaded environment from .env');
}

// Parse arguments
function parseArgs() {
  const args: Record<string, string | boolean> = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value !== undefined ? value : true;
    }
  });
  return args;
}

const args = parseArgs();
const skipTests = args['skip-tests'] === true;
const skipSeed = args['skip-seed'] === true;
const resetData = args.reset === true;
const verbose = args.verbose === true;

// =============================================================================
// SETUP STEPS
// =============================================================================

interface SetupStep {
  name: string;
  fn: () => Promise<boolean>;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

async function checkEnvironment(): Promise<boolean> {
  console.log('\n🔍 Checking environment configuration...\n');

  const required = [
    { name: 'VITE_SUPABASE_URL', value: process.env.VITE_SUPABASE_URL },
    { name: 'VITE_SUPABASE_ANON_KEY', value: process.env.VITE_SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_KEY', value: process.env.SUPABASE_SERVICE_KEY },
  ];

  let allGood = true;

  for (const env of required) {
    if (env.value) {
      // Mask the value for display
      const display = env.name.includes('KEY')
        ? `${env.value.substring(0, 8)}...${env.value.substring(env.value.length - 4)}`
        : env.value;
      console.log(`   ✅ ${env.name}: ${display}`);
    } else {
      console.log(`   ❌ ${env.name}: NOT SET`);
      allGood = false;
    }
  }

  if (!allGood) {
    console.error('\n❌ Missing required environment variables.');
    console.log('   Please set them in your .env.staging.local file\n');
    return false;
  }

  // Check if we're in production
  if (env === 'production') {
    console.error('\n❌ ERROR: This script should not be run in production!');
    console.log('   Use --env=staging instead.\n');
    return false;
  }

  console.log('\n   ✅ Environment configuration looks good');
  return true;
}

async function testConnection(): Promise<boolean> {
  console.log('\n🔌 Testing Supabase connection...\n');

  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.from('users').select('count', { count: 'exact' });

    if (error) {
      console.error(`   ❌ Connection failed: ${error.message}`);
      return false;
    }

    console.log('   ✅ Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error(`   ❌ Connection error: ${err}`);
    return false;
  }
}

async function checkSchema(): Promise<boolean> {
  console.log('\n📋 Checking database schema...\n');

  if (!supabase) {
    console.error('   ❌ Supabase client not initialized');
    return false;
  }

  const requiredTables = [
    'users',
    'venues',
    'instructors',
    'classes',
    'registrations',
    'templates',
    'feedback',
  ];

  let allTablesExist = true;

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ Table '${table}' does not exist`);
          allTablesExist = false;
        } else {
          console.log(`   ⚠️  Table '${table}': ${error.message}`);
        }
      } else {
        if (verbose) console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table '${table}': ${err}`);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    console.log('\n   ⚠️  Some tables are missing. You may need to apply the schema.');
    console.log('      Run: npx tsx apply-schema-via-api.cjs');
  } else {
    console.log('\n   ✅ All required tables exist');
  }

  return allTablesExist;
}

async function runTests(): Promise<boolean> {
  if (skipTests) {
    console.log('\n⏭️  Skipping CRUD tests (--skip-tests)');
    return true;
  }

  console.log('\n🧪 Running CRUD tests...\n');

  try {
    const result = execSync('npx tsx scripts/test-supabase-crud.ts', {
      stdio: verbose ? 'inherit' : 'pipe',
      encoding: 'utf-8',
    });

    if (verbose) {
      console.log(result);
    }

    console.log('   ✅ CRUD tests passed');
    return true;
  } catch (err) {
    console.error('   ❌ CRUD tests failed');
    if (!verbose && err instanceof Error) {
      console.error('\n   Run with --verbose to see details\n');
    }
    return false;
  }
}

async function seedData(): Promise<boolean> {
  if (skipSeed) {
    console.log('\n⏭️  Skipping data seeding (--skip-seed)');
    return true;
  }

  console.log('\n🌱 Seeding test data...\n');

  try {
    const resetFlag = resetData ? '--reset' : '';
    const verboseFlag = verbose ? '--verbose' : '';

    const result = execSync(`npx tsx scripts/seed-test-data.ts ${resetFlag} ${verboseFlag}`, {
      stdio: verbose ? 'inherit' : 'pipe',
      encoding: 'utf-8',
    });

    if (verbose) {
      console.log(result);
    }

    console.log('   ✅ Test data seeded');
    return true;
  } catch (err) {
    console.error('   ❌ Data seeding failed');
    return false;
  }
}

async function printNextSteps(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                   SETUP COMPLETE                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n🎉 Staging environment is ready!\n');

  console.log('Next steps:');
  console.log('   1. Start the dev server: npm run dev');
  console.log(`   2. Open: ${process.env.APP_URL || 'http://localhost:3000'}`);
  console.log('   3. Sign in with test credentials:');
  console.log('      - Admin: admin@test.com');
  console.log('      - Users: [check seeded users]');

  console.log('\nUseful commands:');
  console.log('   npm run test:staging    Run full test suite');
  console.log('   npm run seed:staging    Seed more test data');
  console.log('   npm run migrate:data    Migrate localStorage data\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          Staging Environment Setup                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${env.toUpperCase()}`);
  console.log(`Skip tests: ${skipTests}`);
  console.log(`Skip seed: ${skipSeed}`);
  console.log(`Reset data: ${resetData}\n`);

  const steps: SetupStep[] = [
    { name: 'Environment Check', fn: checkEnvironment },
    { name: 'Connection Test', fn: testConnection },
    { name: 'Schema Check', fn: checkSchema },
    { name: 'CRUD Tests', fn: runTests },
    { name: 'Data Seeding', fn: seedData },
  ];

  const results: { step: string; passed: boolean }[] = [];

  for (const step of steps) {
    try {
      const passed = await step.fn();
      results.push({ step: step.name, passed });

      if (!passed && step.name !== 'Schema Check') {
        console.error(`\n❌ Setup failed at step: ${step.name}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`\n❌ Error in step ${step.name}:`, err);
      results.push({ step: step.name, passed: false });
      process.exit(1);
    }
  }

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     SETUP SUMMARY                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  results.forEach(result => {
    const icon = result.passed ? '✅' : '⚠️';
    console.log(`   ${icon} ${result.step}`);
  });

  // Print next steps
  await printNextSteps();
}

main();
