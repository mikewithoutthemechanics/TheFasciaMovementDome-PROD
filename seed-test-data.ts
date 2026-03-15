#!/usr/bin/env tsx
/**
 * Test Data Seeding Script
 *
 * This script populates the staging environment with test data for testing purposes.
 * It creates sample users, venues, instructors, classes, registrations, and other data.
 *
 * Usage:
 *   export NODE_ENV=staging
 *   npx tsx scripts/seed-test-data.ts
 *
 * Options:
 *   --reset       Clear existing test data before seeding
 *   --verbose     Show detailed progress
 *   --count=50    Number of test records to create (default: varies by entity)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';

// Load environment variables
const env = process.env.NODE_ENV || 'staging';
const envFile = `.env.${env}.local`;
const fallbackEnvFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  config({ path: envFile });
  console.log(`[seed] Loaded environment from ${envFile}`);
} else if (fs.existsSync(fallbackEnvFile)) {
  config({ path: fallbackEnvFile });
  console.log(`[seed] Loaded environment from ${fallbackEnvFile}`);
} else {
  config();
  console.log('[seed] Loaded environment from .env');
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
const shouldReset = args.reset === true;
const verbose = args.verbose === true;

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
// TEST DATA GENERATORS
// =============================================================================

const sports = ['Running', 'Yoga', 'Cycling', 'Swimming', 'CrossFit', 'Tennis', 'Golf', 'Soccer', 'Basketball', 'General'];
const bodyAreas = ['hips', 'shoulders', 'spine', 'neck', 'lower_back', 'knees', 'ankles', 'wrists', 'full_body'];
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Peyton', 'Dakota', 'Skyler', 'Reese', 'Rowan', 'Emerson', 'Finley'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

function generateId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['test.com', 'example.com', 'staging.local', 'demo.app'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generatePhone(): string {
  return `+27${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
}

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedVenues(count: number = 3): Promise<string[]> {
  console.log(`\n📍 Seeding ${count} venues...`);
  const venueIds: string[] = [];

  const venues = [
    { name: 'Pause Studio - Rosebank', address: 'Craddock Ave, Rosebank', suburb: 'Rosebank', mapsUrl: 'https://maps.google.com/?q=rosebank' },
    { name: 'Pause Dome - Sandton', address: 'Rivonia Road, Sandton', suburb: 'Sandton', mapsUrl: 'https://maps.google.com/?q=sandton' },
    { name: 'Pause Studio - Fourways', address: 'William Nicol Drive, Fourways', suburb: 'Fourways', mapsUrl: 'https://maps.google.com/?q=fourways' },
  ];

  for (let i = 0; i < Math.min(count, venues.length); i++) {
    const venue = venues[i];
    const id = `venue_${i + 1}`;
    venueIds.push(id);

    if (shouldReset) {
      await supabase.from('venues').delete().eq('id', id);
    }

    const { error } = await supabase.from('venues').upsert({
      id,
      ...venue,
      active: true,
    });

    if (error) {
      console.error(`   ❌ Error creating venue ${venue.name}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created venue: ${venue.name}`);
    }
  }

  console.log(`   ✓ Created ${venueIds.length} venues`);
  return venueIds;
}

async function seedInstructors(count: number = 4): Promise<string[]> {
  console.log(`\n👨‍🏫 Seeding ${count} instructors...`);
  const instructorIds: string[] = [];

  const instructors = [
    { name: 'Sarah Johnson', email: 'sarah.j@test.com', specialties: ['Yoga', 'General'], bio: 'Certified yoga instructor with 10 years experience' },
    { name: 'Mike Peters', email: 'mike.p@test.com', specialties: ['CrossFit', 'Running'], bio: 'Former athlete specializing in sports recovery' },
    { name: 'Emma Williams', email: 'emma.w@test.com', specialties: ['General', 'Cycling'], bio: 'Fascia movement specialist' },
    { name: 'David Chen', email: 'david.c@test.com', specialties: ['Swimming', 'Tennis'], bio: 'Sports therapist and movement coach' },
  ];

  for (let i = 0; i < Math.min(count, instructors.length); i++) {
    const instructor = instructors[i];
    const id = `instructor_${i + 1}`;
    instructorIds.push(id);

    if (shouldReset) {
      await supabase.from('instructors').delete().eq('id', id);
    }

    const { error } = await supabase.from('instructors').upsert({
      id,
      ...instructor,
      phone: generatePhone(),
      active: true,
    });

    if (error) {
      console.error(`   ❌ Error creating instructor ${instructor.name}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created instructor: ${instructor.name}`);
    }
  }

  console.log(`   ✓ Created ${instructorIds.length} instructors`);
  return instructorIds;
}

async function seedUsers(count: number = 20): Promise<string[]> {
  console.log(`\n👥 Seeding ${count} users...`);
  const userIds: string[] = [];

  // Create admin user first
  const adminId = 'admin_test_001';
  userIds.push(adminId);

  if (shouldReset) {
    await supabase.from('users').delete().eq('id', adminId);
  }

  await supabase.from('users').upsert({
    id: adminId,
    name: 'Admin User',
    email: 'admin@test.com',
    is_admin: true,
    admin_role: 'super_admin',
    credits: 100,
    waiver_accepted: true,
    medical_cleared: true,
    heat_acknowledged: true,
  });

  if (verbose) console.log('   ✅ Created admin user: admin@test.com');

  // Create regular users
  for (let i = 0; i < count - 1; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const id = `user_test_${i + 1}`;
    userIds.push(id);

    if (shouldReset) {
      await supabase.from('users').delete().eq('id', id);
    }

    const { error } = await supabase.from('users').upsert({
      id,
      name: `${firstName} ${lastName}`,
      email: generateEmail(firstName, lastName),
      phone: generatePhone(),
      is_admin: false,
      sport: randomItem(sports),
      credits: Math.floor(Math.random() * 20),
      waiver_accepted: Math.random() > 0.3,
      medical_cleared: Math.random() > 0.2,
      heat_acknowledged: Math.random() > 0.2,
      health_conditions: randomItems(['None', 'Asthma', 'Back Pain', 'Knee Issues'], Math.floor(Math.random() * 3)),
      movement_goals: randomItems(['flexibility', 'pain_relief', 'athletic_performance', 'stress_relief'], Math.floor(Math.random() * 3) + 1),
      movement_experience: randomItem(['beginner', 'intermediate', 'advanced']),
    });

    if (error) {
      console.error(`   ❌ Error creating user ${firstName} ${lastName}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created user: ${firstName} ${lastName}`);
    }
  }

  console.log(`   ✓ Created ${userIds.length} users`);
  return userIds;
}

async function seedClasses(count: number = 15, venueIds: string[], instructorIds: string[]): Promise<string[]> {
  console.log(`\n📅 Seeding ${count} classes...`);
  const classIds: string[] = [];

  const classTitles = [
    'Morning Dome Session', 'Evening Wind Down', 'Athletic Recovery', 'Deep Tissue Release',
    'Weekend Warrior Reset', 'Lunch Break Flow', 'Post-Work Recovery', 'Weekend Intensive',
    'Beginner Basics', 'Advanced Techniques', 'Sport Specific - Runners', 'Sport Specific - Cyclists',
    'Hip Focus Session', 'Shoulder Release', 'Full Body Reset'
  ];

  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const past = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

  for (let i = 0; i < count; i++) {
    const id = `class_test_${i + 1}`;
    classIds.push(id);

    if (shouldReset) {
      await supabase.from('classes').delete().eq('id', id);
    }

    const dateTime = randomDate(i < 5 ? past : now, i < 5 ? now : future);
    const isDome = i % 3 === 0;

    const { error } = await supabase.from('classes').upsert({
      id,
      slug: `class-${i + 1}-${Date.now()}`,
      title: classTitles[i % classTitles.length],
      date_time: dateTime,
      duration: isDome ? 75 : 60,
      venue_id: randomItem(venueIds),
      instructor_id: randomItem(instructorIds),
      sport_tags: randomItems(sports, Math.floor(Math.random() * 3) + 1),
      body_area_tags: randomItems(bodyAreas, Math.floor(Math.random() * 3) + 1),
      capacity: isDome ? 15 : 20,
      registered: 0,
      status: i < 2 ? 'cancelled' : i < 5 ? 'draft' : 'published',
      description: `A ${isDome ? 'heated dome' : 'studio'} session focused on fascial release and movement.`,
      price: i % 4 === 0 ? 250 : 0,
      credit_cost: i % 4 === 0 ? 2 : 1,
      allow_dome_reset_override: false,
    });

    if (error) {
      console.error(`   ❌ Error creating class ${i + 1}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created class: ${classTitles[i % classTitles.length]}`);
    }
  }

  console.log(`   ✓ Created ${classIds.length} classes`);
  return classIds;
}

async function seedRegistrations(count: number = 50, userIds: string[], classIds: string[]): Promise<void> {
  console.log(`\n📝 Seeding ${count} registrations...`);

  // Skip admin user (first in list)
  const regularUsers = userIds.slice(1);

  for (let i = 0; i < count; i++) {
    const id = `reg_test_${i + 1}`;

    if (shouldReset) {
      await supabase.from('registrations').delete().eq('id', id);
    }

    const userId = randomItem(regularUsers);
    const user = await supabase.from('users').select('name, email, sport').eq('id', userId).single();
    const classId = randomItem(classIds);

    const statuses = ['confirmed', 'registered', 'cancelled', 'waitlisted', 'payment_review'];
    const status = randomItem(statuses);
    const isPaid = status === 'confirmed' || status === 'payment_review';

    const { error } = await supabase.from('registrations').upsert({
      id,
      class_id: classId,
      user_id: userId,
      user_name: user.data?.name || 'Unknown',
      user_email: user.data?.email,
      user_sport: user.data?.sport || 'General',
      body_areas: randomItems(bodyAreas, Math.floor(Math.random() * 3) + 1),
      referred_by: Math.random() > 0.8 ? randomItem(regularUsers) : null,
      status,
      payment_status: isPaid ? 'paid' : 'pending',
      payment_method: isPaid ? randomItem(['zapper', 'manual']) : null,
      registered_at: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      notes: Math.random() > 0.7 ? 'Test registration note' : null,
    });

    if (error) {
      console.error(`   ❌ Error creating registration ${i + 1}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created registration ${i + 1}`);
    }
  }

  console.log(`   ✓ Created ${count} registrations`);
}

async function seedTemplates(count: number = 5): Promise<void> {
  console.log(`\n📄 Seeding ${count} templates...`);

  const templates = [
    {
      name: 'Welcome Message',
      whatsappBody: 'Hi {{name}}! Welcome to Pause Fascia Movement. Your class "{{class_title}}" is confirmed for {{date}} at {{time}}.',
      emailSubject: 'Welcome to Pause - Class Confirmed',
      emailBody: 'Dear {{name}},\n\nWelcome to Pause Fascia Movement!\n\nYour booking for "{{class_title}}" has been confirmed.\n\nDate: {{date}}\nTime: {{time}}\nVenue: {{venue}}\n\nSee you soon!\n\nThe Pause Team',
    },
    {
      name: 'Waitlist Notification',
      whatsappBody: 'Hi {{name}}! A spot opened up for "{{class_title}}". You have been moved from waitlist to confirmed.',
      emailSubject: 'Spot Available - You\'re In!',
      emailBody: 'Dear {{name}},\n\nGreat news! A spot has opened up for "{{class_title}}".\n\nYou have been moved from the waitlist to CONFIRMED.\n\nDate: {{date}}\nTime: {{time}}\n\nSee you there!',
    },
    {
      name: 'Class Reminder',
      whatsappBody: 'Hi {{name}}! Reminder: Your class "{{class_title}}" is tomorrow at {{time}}.',
      emailSubject: 'Reminder: Class Tomorrow',
      emailBody: 'Dear {{name}},\n\nJust a friendly reminder that you have a class tomorrow:\n\n"{{class_title}}"\nDate: {{date}}\nTime: {{time}}\nVenue: {{venue}}\n\nSee you then!',
    },
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const id = `template_test_${i + 1}`;
    const template = templates[i];

    if (shouldReset) {
      await supabase.from('templates').delete().eq('id', id);
    }

    const { error } = await supabase.from('templates').upsert({
      id,
      name: template.name,
      sport_tags: randomItems(sports, 2),
      body_area_tags: randomItems(bodyAreas, 2),
      active: true,
      whatsapp_body: template.whatsappBody,
      email_subject: template.emailSubject,
      email_body: template.emailBody,
    });

    if (error) {
      console.error(`   ❌ Error creating template ${template.name}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created template: ${template.name}`);
    }
  }

  console.log(`   ✓ Created ${Math.min(count, templates.length)} templates`);
}

async function seedFeedback(count: number = 30, userIds: string[], classIds: string[]): Promise<void> {
  console.log(`\n⭐ Seeding ${count} feedback entries...`);

  const regularUsers = userIds.slice(1);

  for (let i = 0; i < count; i++) {
    const id = `feedback_test_${i + 1}`;

    if (shouldReset) {
      await supabase.from('feedback').delete().eq('id', id);
    }

    const userId = randomItem(regularUsers);
    const user = await supabase.from('users').select('name').eq('id', userId).single();
    const type = randomItem(['post_class', 'general', 'nps']);

    const { error } = await supabase.from('feedback').upsert({
      id,
      class_id: type === 'post_class' ? randomItem(classIds) : null,
      user_id: userId,
      user_name: user.data?.name || 'Anonymous',
      type,
      rating: type !== 'nps' ? Math.floor(Math.random() * 5) + 1 : null,
      nps_score: type === 'nps' ? Math.floor(Math.random() * 11) : null,
      comment: Math.random() > 0.5 ? 'Great session! Really helped with my flexibility.' : null,
    });

    if (error) {
      console.error(`   ❌ Error creating feedback ${i + 1}:`, error.message);
    } else {
      if (verbose) console.log(`   ✅ Created feedback ${i + 1}`);
    }
  }

  console.log(`   ✓ Created ${count} feedback entries`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Test Data Seeding Script                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${env.toUpperCase()}`);
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Reset mode: ${shouldReset ? 'YES' : 'NO'}`);
  console.log(`Verbose: ${verbose ? 'YES' : 'NO'}`);

  if (env === 'production') {
    console.error('\n❌ ERROR: Cannot seed test data in production!');
    process.exit(1);
  }

  console.log('\n⚠️  This will seed test data into your database.');
  if (!shouldReset) {
    console.log('   Existing data will be preserved (use --reset to clear first).');
  }
  console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const startTime = Date.now();

  try {
    // Seed in order respecting foreign keys
    const venueIds = await seedVenues(3);
    const instructorIds = await seedInstructors(4);
    const userIds = await seedUsers(20);
    const classIds = await seedClasses(15, venueIds, instructorIds);

    // These can run in parallel after base data exists
    await Promise.all([
      seedRegistrations(50, userIds, classIds),
      seedTemplates(3),
      seedFeedback(30, userIds, classIds),
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                  SEEDING COMPLETE                                ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(`\n⏱️  Duration: ${duration}s`);
    console.log('\n🎉 Test data seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('   Admin: admin@test.com (password: set via Supabase Auth)');
    console.log('   Users: 19 regular test users created');
    console.log('\nNext steps:');
    console.log('   1. Run tests: npm run test:staging');
    console.log('   2. Open app and sign in with test credentials');
    console.log('   3. Verify data appears correctly\n');

  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  }
}

main();
