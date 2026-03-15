#!/usr/bin/env tsx
/**
 * LocalStorage to Supabase Migration Script
 *
 * This script migrates data from browser localStorage exports to Supabase.
 * It reads localStorage data (exported as JSON files) and imports them into Supabase.
 *
 * Usage:
 *   export NODE_ENV=staging  # or production
 *   npx tsx scripts/migrate-localstorage-to-supabase.ts --input=./localstorage-export.json
 *
 * Or with environment:
 *   npx tsx scripts/migrate-localstorage-to-supabase.ts --input=./export.json --env=staging
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import type { WaiverData } from '../types';

interface MigratedUserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
  adminRole?: string;
  sport?: string;
  waiverData?: WaiverData;
  waiverAccepted?: boolean;
  waiverDate?: string;
  medicalCleared?: boolean;
  heatAcknowledged?: boolean;
  credits?: number;
  injuries?: Array<{ area: string; description: string }>;
  healthConditions?: string[];
  movementExperience?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
}

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}.local`;
const fallbackEnvFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  config({ path: envFile });
  console.log(`[migrate] Loaded environment from ${envFile}`);
} else if (fs.existsSync(fallbackEnvFile)) {
  config({ path: fallbackEnvFile });
  console.log(`[migrate] Loaded environment from ${fallbackEnvFile}`);
} else {
  config();
  console.log('[migrate] Loaded environment from .env');
}

// Parse command line arguments
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || 'true';
    }
  });
  return args;
}

const args = parseArgs();
const inputFile = args.input || args.i;
const dryRun = args['dry-run'] === 'true' || args.dry === 'true';
const verbose = args.verbose === 'true' || args.v === 'true';

if (!inputFile) {
  console.error('❌ Error: Please specify input file with --input=./export.json');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/migrate-localstorage-to-supabase.ts --input=./localstorage-export.json');
  console.log('  npx tsx scripts/migrate-localstorage-to-supabase.ts --input=./export.json --dry-run');
  console.log('  npx tsx scripts/migrate-localstorage-to-supabase.ts --input=./export.json --verbose');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Migration statistics
interface MigrationStats {
  users: { imported: number; skipped: number; errors: number };
  classes: { imported: number; skipped: number; errors: number };
  registrations: { imported: number; skipped: number; errors: number };
  venues: { imported: number; skipped: number; errors: number };
  instructors: { imported: number; skipped: number; errors: number };
  templates: { imported: number; skipped: number; errors: number };
  crmContacts: { imported: number; skipped: number; errors: number };
  feedback: { imported: number; skipped: number; errors: number };
}

const stats: MigrationStats = {
  users: { imported: 0, skipped: 0, errors: 0 },
  classes: { imported: 0, skipped: 0, errors: 0 },
  registrations: { imported: 0, skipped: 0, errors: 0 },
  venues: { imported: 0, skipped: 0, errors: 0 },
  instructors: { imported: 0, skipped: 0, errors: 0 },
  templates: { imported: 0, skipped: 0, errors: 0 },
  crmContacts: { imported: 0, skipped: 0, errors: 0 },
  feedback: { imported: 0, skipped: 0, errors: 0 },
};

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

async function migrateUsers(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating users...');

  for (const user of data) {
    try {
      const userData = user as MigratedUserData;

      // Map camelCase to snake_case
      const row = {
        id: userData.id as string,
        name: userData.name as string,
        email: userData.email as string,
        phone: userData.phone || null,
        is_admin: userData.isAdmin || false,
        admin_role: userData.adminRole || null,
        sport: userData.sport || null,
        waiver_accepted: userData.waiverAccepted || userData.waiverData?.signed || false,
        medical_cleared: userData.medicalCleared || userData.waiverData?.agreements?.medical || false,
        heat_acknowledged: userData.heatAcknowledged || userData.waiverData?.agreements?.heat || false,
        waiver_date: userData.waiverDate || userData.waiverData?.signedAt || null,
        credits: userData.credits || 0,
        waiver_data: userData.waiverData || null,
        injuries: userData.injuries || [],
        health_conditions: userData.healthConditions || [],
        movement_experience: userData.movementExperience || null,
        two_factor_enabled: userData.twoFactorEnabled || false,
        two_factor_secret: userData.twoFactorSecret || null,
        two_factor_backup_codes: userData.twoFactorBackupCodes || [],
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import user: ${row.email}`);
        stats.users.imported++;
        continue;
      }

      // Check if user already exists
      const { data: existing } = await supabase.from('users').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing user: ${row.email}`);
        stats.users.skipped++;
        continue;
      }

      const { error } = await supabase.from('users').insert(row);

      if (error) {
        console.error(`   ❌ Error importing user ${row.email}:`, error.message);
        stats.users.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported user: ${row.email}`);
        stats.users.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing user:`, err);
      stats.users.errors++;
    }
  }
}

async function migrateVenues(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating venues...');

  for (const venue of data) {
    try {
      const venueData = venue as Record<string, unknown>;

      const row = {
        id: venueData.id as string,
        name: venueData.name as string,
        address: venueData.address as string,
        suburb: venueData.suburb || '',
        maps_url: venueData.mapsUrl || '',
        notes: venueData.notes || '',
        active: true,
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import venue: ${row.name}`);
        stats.venues.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('venues').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing venue: ${row.name}`);
        stats.venues.skipped++;
        continue;
      }

      const { error } = await supabase.from('venues').insert(row);

      if (error) {
        console.error(`   ❌ Error importing venue ${row.name}:`, error.message);
        stats.venues.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported venue: ${row.name}`);
        stats.venues.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing venue:`, err);
      stats.venues.errors++;
    }
  }
}

async function migrateInstructors(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating instructors...');

  for (const instructor of data) {
    try {
      const instData = instructor as Record<string, unknown>;

      const row = {
        id: instData.id as string,
        name: instData.name as string,
        email: instData.email as string,
        phone: instData.phone || null,
        bio: instData.bio || null,
        specialties: instData.specialties || [],
        avatar: instData.avatar || null,
        active: instData.active !== false,
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import instructor: ${row.name}`);
        stats.instructors.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('instructors').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing instructor: ${row.name}`);
        stats.instructors.skipped++;
        continue;
      }

      const { error } = await supabase.from('instructors').insert(row);

      if (error) {
        console.error(`   ❌ Error importing instructor ${row.name}:`, error.message);
        stats.instructors.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported instructor: ${row.name}`);
        stats.instructors.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing instructor:`, err);
      stats.instructors.errors++;
    }
  }
}

async function migrateClasses(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating classes...');

  for (const cls of data) {
    try {
      const classData = cls as Record<string, unknown>;

      const row = {
        id: classData.id as string,
        slug: classData.slug as string,
        title: classData.title as string,
        date_time: classData.dateTime as string,
        duration: classData.duration || 75,
        venue_id: classData.venueId || null,
        instructor_id: classData.instructorId || null,
        sport_tags: classData.sportTags || [],
        body_area_tags: classData.bodyAreaTags || [],
        capacity: classData.capacity || 15,
        registered: classData.registered || 0,
        status: classData.status || 'draft',
        description: classData.description || '',
        price: classData.price || 0,
        credit_cost: classData.creditCost || 0,
        allow_dome_reset_override: classData.allowDomeResetOverride || false,
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import class: ${row.title}`);
        stats.classes.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('classes').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing class: ${row.title}`);
        stats.classes.skipped++;
        continue;
      }

      const { error } = await supabase.from('classes').insert(row);

      if (error) {
        console.error(`   ❌ Error importing class ${row.title}:`, error.message);
        stats.classes.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported class: ${row.title}`);
        stats.classes.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing class:`, err);
      stats.classes.errors++;
    }
  }
}

async function migrateRegistrations(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating registrations...');

  for (const reg of data) {
    try {
      const regData = reg as Record<string, unknown>;

      const row = {
        id: regData.id as string,
        class_id: regData.classId as string,
        user_id: regData.userId as string,
        user_name: regData.userName as string,
        user_email: regData.userEmail || null,
        user_sport: regData.userSport || '',
        body_areas: regData.bodyAreas || [],
        referred_by: regData.referredBy || null,
        status: regData.status || 'registered',
        payment_status: regData.paymentStatus || 'pending',
        payment_method: regData.paymentMethod || null,
        payment_proof: regData.paymentProof || null,
        registered_at: regData.registeredAt as string,
        notes: regData.notes || null,
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import registration: ${row.user_name} -> ${row.class_id}`);
        stats.registrations.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('registrations').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing registration: ${row.user_name}`);
        stats.registrations.skipped++;
        continue;
      }

      const { error } = await supabase.from('registrations').insert(row);

      if (error) {
        console.error(`   ❌ Error importing registration:`, error.message);
        stats.registrations.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported registration: ${row.user_name}`);
        stats.registrations.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing registration:`, err);
      stats.registrations.errors++;
    }
  }
}

async function migrateTemplates(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating templates...');

  for (const template of data) {
    try {
      const tmplData = template as Record<string, unknown>;

      const row = {
        id: tmplData.id as string,
        name: tmplData.name as string,
        sport_tags: tmplData.sportTags || [],
        body_area_tags: tmplData.bodyAreaTags || [],
        active: tmplData.active !== false,
        whatsapp_body: tmplData.whatsappBody || '',
        email_subject: tmplData.emailSubject || '',
        email_body: tmplData.emailBody || '',
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import template: ${row.name}`);
        stats.templates.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('templates').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing template: ${row.name}`);
        stats.templates.skipped++;
        continue;
      }

      const { error } = await supabase.from('templates').insert(row);

      if (error) {
        console.error(`   ❌ Error importing template ${row.name}:`, error.message);
        stats.templates.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported template: ${row.name}`);
        stats.templates.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing template:`, err);
      stats.templates.errors++;
    }
  }
}

async function migrateFeedback(data: unknown[]): Promise<void> {
  console.log('\n📦 Migrating feedback...');

  for (const fb of data) {
    try {
      const fbData = fb as Record<string, unknown>;

      const row = {
        id: fbData.id as string,
        class_id: fbData.classId || null,
        user_id: fbData.userId as string,
        user_name: fbData.userName as string,
        type: fbData.type as string,
        rating: fbData.rating || null,
        nps_score: fbData.npsScore || null,
        comment: fbData.comment || null,
      };

      if (dryRun) {
        if (verbose) console.log(`   [DRY RUN] Would import feedback from: ${row.user_name}`);
        stats.feedback.imported++;
        continue;
      }

      const { data: existing } = await supabase.from('feedback').select('id').eq('id', row.id).single();

      if (existing) {
        if (verbose) console.log(`   ⏭️  Skipping existing feedback: ${row.user_name}`);
        stats.feedback.skipped++;
        continue;
      }

      const { error } = await supabase.from('feedback').insert(row);

      if (error) {
        console.error(`   ❌ Error importing feedback:`, error.message);
        stats.feedback.errors++;
      } else {
        if (verbose) console.log(`   ✅ Imported feedback: ${row.user_name}`);
        stats.feedback.imported++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing feedback:`, err);
      stats.feedback.errors++;
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     LocalStorage to Supabase Migration Script                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${env.toUpperCase()}`);
  console.log(`Input file: ${inputFile}`);
  console.log(`Dry run: ${dryRun ? 'YES (no changes will be made)' : 'NO'}`);
  console.log(`Verbose: ${verbose ? 'YES' : 'NO'}`);

  // Check if input file exists
  const fullPath = path.resolve(inputFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Error: Input file not found: ${fullPath}`);
    process.exit(1);
  }

  // Read and parse input file
  let localStorageData: Record<string, unknown>;
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    localStorageData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`\n❌ Error: Failed to parse input file:`, err);
    process.exit(1);
  }

  console.log(`\n✅ Loaded localStorage export with ${Object.keys(localStorageData).length} data types`);

  // Confirm before migration (unless dry run)
  if (!dryRun) {
    console.log('\n⚠️  WARNING: This will modify data in your Supabase database!');
    console.log(`   Target: ${supabaseUrl}`);
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Start migration
  console.log('\n🚀 Starting migration...\n');
  const startTime = Date.now();

  try {
    // Migrate in order to respect foreign key constraints
    if (localStorageData.users) {
      await migrateUsers(localStorageData.users as unknown[]);
    }

    if (localStorageData.venues) {
      await migrateVenues(localStorageData.venues as unknown[]);
    }

    if (localStorageData.instructors) {
      await migrateInstructors(localStorageData.instructors as unknown[]);
    }

    if (localStorageData.classes) {
      await migrateClasses(localStorageData.classes as unknown[]);
    }

    if (localStorageData.registrations) {
      await migrateRegistrations(localStorageData.registrations as unknown[]);
    }

    if (localStorageData.templates) {
      await migrateTemplates(localStorageData.templates as unknown[]);
    }

    if (localStorageData.feedback) {
      await migrateFeedback(localStorageData.feedback as unknown[]);
    }

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                      MIGRATION SUMMARY                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(`\n⏱️  Duration: ${duration}s\n`);

    Object.entries(stats).forEach(([key, value]) => {
      const total = value.imported + value.skipped + value.errors;
      if (total > 0) {
        console.log(`📊 ${key}:`);
        console.log(`   ✅ Imported: ${value.imported}`);
        console.log(`   ⏭️  Skipped:  ${value.skipped}`);
        console.log(`   ❌ Errors:   ${value.errors}`);
      }
    });

    if (dryRun) {
      console.log('\n🏁 Dry run completed. No changes were made.');
      console.log('   Run without --dry-run to perform actual migration.');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
