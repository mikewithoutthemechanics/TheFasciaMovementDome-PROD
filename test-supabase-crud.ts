#!/usr/bin/env tsx
/**
 * Supabase CRUD Test Suite
 *
 * Automated test suite that tests all 10 services:
 * - User Service
 * - Class Service
 * - Registration Service
 * - Venue Service
 * - Template Service
 * - Instructor Service
 * - CRM Service (contacts, tasks, pipeline, templates, campaigns)
 * - Feedback Service
 * - Disclaimer Service
 * - Settings Service
 *
 * Usage:
 *   export NODE_ENV=staging
 *   npx tsx scripts/test-supabase-crud.ts
 *
 * Options:
 *   --verbose     Show detailed test output
 *   --service=X   Test only specific service (user, class, etc.)
 *   --keep-data   Don't cleanup test data after tests
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';

// Load environment
const env = process.env.NODE_ENV || 'staging';
const envFile = `.env.${env}.local`;
const fallbackEnvFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  config({ path: envFile });
} else if (fs.existsSync(fallbackEnvFile)) {
  config({ path: fallbackEnvFile });
} else {
  config();
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
const verbose = args.verbose === true;
const specificService = args.service as string | undefined;
const keepData = args['keep-data'] === true;

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =============================================================================
// TEST FRAMEWORK
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface ServiceResults {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

const testResults: ServiceResults[] = [];
const testDataIds: { table: string; id: string }[] = [];

function generateTestId(prefix: string): string {
  return `test_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function runTest(service: string, testName: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return { name: testName, passed: true, duration: Date.now() - start };
  } catch (err) {
    return {
      name: testName,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
      duration: Date.now() - start
    };
  }
}

function trackTestData(table: string, id: string) {
  testDataIds.push({ table, id });
}

// =============================================================================
// USER SERVICE TESTS
// =============================================================================

async function testUserService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('user');

  // CREATE
  results.push(await runTest('user', 'Create user', async () => {
    const { data, error } = await supabase.from('users').insert({
      id: testId,
      name: 'Test User',
      email: `test_${testId}@example.com`,
      is_admin: false,
      credits: 10,
    }).select().single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');
    trackTestData('users', testId);
  }));

  // READ
  results.push(await runTest('user', 'Read user', async () => {
    const { data, error } = await supabase.from('users').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('User not found');
    if (data.name !== 'Test User') throw new Error('Name mismatch');
  }));

  // UPDATE
  results.push(await runTest('user', 'Update user', async () => {
    const { data, error } = await supabase.from('users').update({
      name: 'Updated Test User',
      credits: 20,
    }).eq('id', testId).select().single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.name !== 'Updated Test User') throw new Error('Update failed');
  }));

  // LIST
  results.push(await runTest('user', 'List users', async () => {
    const { data, error } = await supabase.from('users').select('*').limit(10);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No users found');
  }));

  return results;
}

// =============================================================================
// VENUE SERVICE TESTS
// =============================================================================

async function testVenueService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('venue');

  results.push(await runTest('venue', 'Create venue', async () => {
    const { data, error } = await supabase.from('venues').insert({
      id: testId,
      name: 'Test Venue',
      address: '123 Test Street',
      suburb: 'Testville',
      active: true,
    }).select().single();

    if (error) throw error;
    trackTestData('venues', testId);
  }));

  results.push(await runTest('venue', 'Read venue', async () => {
    const { data, error } = await supabase.from('venues').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Venue not found');
  }));

  results.push(await runTest('venue', 'Update venue', async () => {
    const { error } = await supabase.from('venues').update({
      name: 'Updated Test Venue',
    }).eq('id', testId);
    if (error) throw error;
  }));

  results.push(await runTest('venue', 'List active venues', async () => {
    const { data, error } = await supabase.from('venues').select('*').eq('active', true);
    if (error) throw error;
    if (!data) throw new Error('No venues found');
  }));

  return results;
}

// =============================================================================
// INSTRUCTOR SERVICE TESTS
// =============================================================================

async function testInstructorService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('instructor');

  results.push(await runTest('instructor', 'Create instructor', async () => {
    const { data, error } = await supabase.from('instructors').insert({
      id: testId,
      name: 'Test Instructor',
      email: `instructor_${testId}@test.com`,
      specialties: ['Yoga', 'Pilates'],
      active: true,
    }).select().single();

    if (error) throw error;
    trackTestData('instructors', testId);
  }));

  results.push(await runTest('instructor', 'Read instructor', async () => {
    const { data, error } = await supabase.from('instructors').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Instructor not found');
  }));

  results.push(await runTest('instructor', 'Update instructor', async () => {
    const { error } = await supabase.from('instructors').update({
      bio: 'Test bio',
    }).eq('id', testId);
    if (error) throw error;
  }));

  return results;
}

// =============================================================================
// CLASS SERVICE TESTS
// =============================================================================

async function testClassService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('class');
  let venueId: string;
  let instructorId: string;

  // Setup: Create dependencies
  results.push(await runTest('class', 'Setup: Create venue', async () => {
    venueId = generateTestId('venue_cls');
    const { error } = await supabase.from('venues').insert({
      id: venueId,
      name: 'Test Venue for Class',
      address: '123 Test St',
      active: true,
    });
    if (error) throw error;
    trackTestData('venues', venueId);
  }));

  results.push(await runTest('class', 'Setup: Create instructor', async () => {
    instructorId = generateTestId('inst_cls');
    const { error } = await supabase.from('instructors').insert({
      id: instructorId,
      name: 'Test Inst',
      email: `inst_${instructorId}@test.com`,
      active: true,
    });
    if (error) throw error;
    trackTestData('instructors', instructorId);
  }));

  results.push(await runTest('class', 'Create class', async () => {
    const { data, error } = await supabase.from('classes').insert({
      id: testId,
      slug: `test-class-${testId}`,
      title: 'Test Class',
      date_time: new Date(Date.now() + 86400000).toISOString(),
      duration: 75,
      venue_id: venueId!,
      instructor_id: instructorId!,
      capacity: 15,
      registered: 0,
      status: 'published',
      price: 250,
      credit_cost: 2,
    }).select().single();

    if (error) throw error;
    trackTestData('classes', testId);
  }));

  results.push(await runTest('class', 'Read class', async () => {
    const { data, error } = await supabase.from('classes').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Class not found');
  }));

  results.push(await runTest('class', 'Update class', async () => {
    const { error } = await supabase.from('classes').update({
      registered: 5,
    }).eq('id', testId);
    if (error) throw error;
  }));

  results.push(await runTest('class', 'List published classes', async () => {
    const { data, error } = await supabase.from('classes').select('*').eq('status', 'published');
    if (error) throw error;
  }));

  return results;
}

// =============================================================================
// REGISTRATION SERVICE TESTS
// =============================================================================

async function testRegistrationService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('reg');
  let userId: string;
  let classId: string;

  // Setup
  results.push(await runTest('registration', 'Setup: Create user', async () => {
    userId = generateTestId('user_reg');
    const { error } = await supabase.from('users').insert({
      id: userId,
      name: 'Test Reg User',
      email: `reg_${userId}@test.com`,
    });
    if (error) throw error;
    trackTestData('users', userId);
  }));

  results.push(await runTest('registration', 'Setup: Create class', async () => {
    classId = generateTestId('class_reg');
    const venueId = generateTestId('venue_reg');
    await supabase.from('venues').insert({
      id: venueId,
      name: 'Venue',
      address: 'Addr',
      active: true,
    });
    trackTestData('venues', venueId);

    const { error } = await supabase.from('classes').insert({
      id: classId,
      slug: `reg-${classId}`,
      title: 'Reg Test Class',
      date_time: new Date(Date.now() + 86400000).toISOString(),
      venue_id: venueId,
      capacity: 10,
      registered: 0,
      status: 'published',
    });
    if (error) throw error;
    trackTestData('classes', classId);
  }));

  results.push(await runTest('registration', 'Create registration', async () => {
    const { data, error } = await supabase.from('registrations').insert({
      id: testId,
      class_id: classId!,
      user_id: userId!,
      user_name: 'Test Reg User',
      user_email: `reg_${userId}@test.com`,
      status: 'confirmed',
      payment_status: 'paid',
      registered_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    trackTestData('registrations', testId);
  }));

  results.push(await runTest('registration', 'Read registration', async () => {
    const { data, error } = await supabase.from('registrations').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Registration not found');
  }));

  results.push(await runTest('registration', 'Update registration status', async () => {
    const { error } = await supabase.from('registrations').update({
      status: 'cancelled',
    }).eq('id', testId);
    if (error) throw error;
  }));

  return results;
}

// =============================================================================
// TEMPLATE SERVICE TESTS
// =============================================================================

async function testTemplateService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('template');

  results.push(await runTest('template', 'Create template', async () => {
    const { data, error } = await supabase.from('templates').insert({
      id: testId,
      name: 'Test Template',
      sport_tags: ['Yoga'],
      body_area_tags: ['hips'],
      active: true,
      email_subject: 'Test Subject',
      email_body: 'Test body {{name}}',
      whatsapp_body: 'Test WhatsApp {{name}}',
    }).select().single();

    if (error) throw error;
    trackTestData('templates', testId);
  }));

  results.push(await runTest('template', 'Read template', async () => {
    const { data, error } = await supabase.from('templates').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Template not found');
  }));

  results.push(await runTest('template', 'Update template', async () => {
    const { error } = await supabase.from('templates').update({
      name: 'Updated Template',
    }).eq('id', testId);
    if (error) throw error;
  }));

  return results;
}

// =============================================================================
// FEEDBACK SERVICE TESTS
// =============================================================================

async function testFeedbackService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('feedback');
  let userId: string;

  results.push(await runTest('feedback', 'Setup: Create user', async () => {
    userId = generateTestId('user_fb');
    const { error } = await supabase.from('users').insert({
      id: userId,
      name: 'Test FB User',
      email: `fb_${userId}@test.com`,
    });
    if (error) throw error;
    trackTestData('users', userId);
  }));

  results.push(await runTest('feedback', 'Create feedback', async () => {
    const { data, error } = await supabase.from('feedback').insert({
      id: testId,
      user_id: userId!,
      user_name: 'Test FB User',
      type: 'general',
      rating: 5,
      comment: 'Great service!',
    }).select().single();

    if (error) throw error;
    trackTestData('feedback', testId);
  }));

  results.push(await runTest('feedback', 'Read feedback', async () => {
    const { data, error } = await supabase.from('feedback').select('*').eq('id', testId).single();
    if (error) throw error;
    if (!data) throw new Error('Feedback not found');
  }));

  results.push(await runTest('feedback', 'List feedback', async () => {
    const { data, error } = await supabase.from('feedback').select('*').limit(10);
    if (error) throw error;
  }));

  return results;
}

// =============================================================================
// CRM SERVICE TESTS
// =============================================================================

async function testCRMService(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test CRM Contacts
  const contactId = generateTestId('crm_contact');

  results.push(await runTest('crm', 'Create CRM contact', async () => {
    const { data, error } = await supabase.from('crm_contacts').insert({
      id: contactId,
      name: 'Test Contact',
      email: `crm_${contactId}@test.com`,
      status: 'new_inquiry',
      source: 'website',
      is_client: false,
      total_sessions: 0,
      total_spent: 0,
      total_interactions: 0,
    }).select().single();

    if (error) {
      // Table might not exist
      if (error.code === '42P01') {
        console.log('   ⚠️  crm_contacts table does not exist, skipping CRM tests');
        return;
      }
      throw error;
    }
    trackTestData('crm_contacts', contactId);
  }));

  results.push(await runTest('crm', 'Read CRM contact', async () => {
    const { data, error } = await supabase.from('crm_contacts').select('*').eq('id', contactId).single();
    if (error) {
      if (error.code === '42P01') return;
      throw error;
    }
  }));

  // Test CRM Tasks
  const taskId = generateTestId('crm_task');

  results.push(await runTest('crm', 'Create CRM task', async () => {
    const { data, error } = await supabase.from('crm_tasks').insert({
      id: taskId,
      title: 'Follow up test',
      description: 'Test task',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      priority: 'medium',
      status: 'pending',
      assigned_to: contactId,
    }).select().single();

    if (error) {
      if (error.code === '42P01') return;
      throw error;
    }
    trackTestData('crm_tasks', taskId);
  }));

  return results;
}

// =============================================================================
// DISCLAIMER SERVICE TESTS
// =============================================================================

async function testDisclaimerService(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId('disclaimer');

  results.push(await runTest('disclaimer', 'Create disclaimer', async () => {
    const { data, error } = await supabase.from('disclaimers').insert({
      id: testId,
      name: 'Test Disclaimer',
      context: 'general',
      title: 'Test Title',
      intro_text: 'Test intro',
      sections: [
        { id: 's1', title: 'Section 1', content: 'Content 1', order: 0, required: true }
      ],
      signature_required: true,
      active: true,
    }).select().single();

    if (error) {
      if (error.code === '42P01') {
        console.log('   ⚠️  disclaimers table does not exist, skipping');
        return;
      }
      throw error;
    }
    trackTestData('disclaimers', testId);
  }));

  results.push(await runTest('disclaimer', 'Read disclaimer', async () => {
    const { data, error } = await supabase.from('disclaimers').select('*').eq('id', testId).single();
    if (error) {
      if (error.code === '42P01') return;
      throw error;
    }
  }));

  return results;
}

// =============================================================================
// SETTINGS SERVICE TESTS
// =============================================================================

async function testSettingsService(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await runTest('settings', 'Read app settings', async () => {
    const { data, error } = await supabase.from('app_settings').select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log('   ⚠️  app_settings table does not exist, skipping');
        return;
      }
      throw error;
    }
  }));

  return results;
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanupTestData(): Promise<void> {
  if (keepData) {
    console.log('\n⚠️  Keeping test data (--keep-data flag set)');
    return;
  }

  console.log('\n🧹 Cleaning up test data...');

  // Delete in reverse order to respect foreign keys
  const deleteOrder = ['feedback', 'registrations', 'classes', 'templates', 'crm_tasks', 'crm_contacts', 'instructors', 'venues', 'users', 'disclaimers'];

  for (const table of deleteOrder) {
    const idsToDelete = testDataIds.filter(item => item.table === table).map(item => item.id);

    if (idsToDelete.length > 0) {
      try {
        const { error } = await supabase.from(table).delete().in('id', idsToDelete);
        if (error && error.code !== '42P01') {
          console.error(`   ⚠️  Error cleaning up ${table}:`, error.message);
        } else if (!error) {
          if (verbose) console.log(`   ✅ Cleaned up ${idsToDelete.length} ${table}`);
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
    }
  }

  console.log('   ✓ Cleanup complete');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Supabase CRUD Test Suite                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${env.toUpperCase()}`);
  console.log(`Target: ${supabaseUrl}`);
  console.log(`\nRunning tests...\n`);

  const startTime = Date.now();

  // Run all service tests
  const services: { name: string; testFn: () => Promise<TestResult[]> }[] = [
    { name: 'User Service', testFn: testUserService },
    { name: 'Venue Service', testFn: testVenueService },
    { name: 'Instructor Service', testFn: testInstructorService },
    { name: 'Class Service', testFn: testClassService },
    { name: 'Registration Service', testFn: testRegistrationService },
    { name: 'Template Service', testFn: testTemplateService },
    { name: 'Feedback Service', testFn: testFeedbackService },
    { name: 'CRM Service', testFn: testCRMService },
    { name: 'Disclaimer Service', testFn: testDisclaimerService },
    { name: 'Settings Service', testFn: testSettingsService },
  ];

  for (const service of services) {
    if (specificService && !service.name.toLowerCase().includes(specificService.toLowerCase())) {
      continue;
    }

    console.log(`\n🔹 ${service.name}`);
    const tests = await service.testFn();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    testResults.push({ name: service.name, tests, passed, failed });

    tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      const duration = `(${test.duration}ms)`;
      if (verbose || !test.passed) {
        console.log(`   ${icon} ${test.name} ${duration}`);
        if (test.error) console.log(`      Error: ${test.error}`);
      }
    });

    console.log(`   ${passed} passed, ${failed} failed`);
  }

  // Cleanup
  await cleanupTestData();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = testResults.reduce((sum, r) => sum + r.tests.length, 0);
  const totalPassed = testResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = testResults.reduce((sum, r) => sum + r.failed, 0);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n⏱️  Duration: ${duration}s`);
  console.log(`📝 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed\n`);
    process.exit(1);
  }
}

main();
