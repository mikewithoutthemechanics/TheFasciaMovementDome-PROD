#!/usr/bin/env tsx
/**
 * Essential Data Seeding Script
 * 
 * This script populates essential baseline data needed for the app to function.
 * It creates:
 * - 2 venues
 * - 2 instructors
 * - 1 general waiver disclaimer
 * - 5 CRM pipeline stages
 * - 2 CRM email templates
 * - 2 notification templates
 * 
 * Usage:
 *   export NODE_ENV=staging
 *   npx tsx scripts/seed-essential-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const env = process.env.NODE_ENV || 'staging';

// =============================================================================
// SECURITY: PRODUCTION GUARD
// This script performs destructive DELETE operations on every seeded table.
// It must never run against a production database.
// =============================================================================
if (env === 'production') {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════════╗');
  console.error('║   🚨  PRODUCTION RUN BLOCKED                                    ║');
  console.error('║                                                                  ║');
  console.error('║   This script deletes ALL rows from venues, instructors,         ║');
  console.error('║   disclaimers, templates, and CRM tables before re-seeding.     ║');
  console.error('║                                                                  ║');
  console.error('║   NODE_ENV is set to "production" — aborting immediately.       ║');
  console.error('║                                                                  ║');
  console.error('║   If you genuinely need to re-seed production data, you must:   ║');
  console.error('║     1. Do it manually via the Supabase dashboard                ║');
  console.error('║     2. Or set NODE_ENV=staging and point to a staging DB        ║');
  console.error('╚══════════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

// Also block if the Supabase URL looks like a production instance.
// Add your production project ref here to make this check explicit.
const PRODUCTION_URL_FRAGMENTS = [
  // e.g. 'abcdefghijklmnop.supabase.co'  ← add your prod project ref
];

const envFile = `.env.${env}.local`;
const fallbackEnvFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
  console.log(`[seed] Loaded environment from ${envFile}`);
} else if (fs.existsSync(fallbackEnvFile)) {
  require('dotenv').config({ path: fallbackEnvFile });
  console.log(`[seed] Loaded environment from ${fallbackEnvFile}`);
} else {
  require('dotenv').config();
  console.log('[seed] Loaded environment from .env');
}

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  process.exit(1);
}

// Secondary guard: block if the resolved URL matches any known production fragment
if (PRODUCTION_URL_FRAGMENTS.some(fragment => supabaseUrl.includes(fragment))) {
  console.error('🚨 BLOCKED: Resolved Supabase URL matches a known production instance.');
  console.error(`   URL: ${supabaseUrl}`);
  console.error('   Add your production project ref to PRODUCTION_URL_FRAGMENTS to keep this guard active.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =============================================================================
// ESSENTIAL DATA SEEDING
// =============================================================================

interface SeedResult {
  table: string;
  success: boolean;
  count: number;
  error?: string;
}

const results: SeedResult[] = [];

async function seedVenues(): Promise<SeedResult> {
  console.log('\n📍 Seeding venues...');
  
  const venues = [
    {
      id: 'venue_1',
      name: 'Pause Studio - Rosebank',
      address: 'Craddock Ave, Rosebank, Johannesburg',
      suburb: 'Rosebank',
      maps_url: 'https://maps.google.com/?q=-26.1457,28.0451',
      notes: 'Main studio location with 2 treatment rooms',
      active: true,
    },
    {
      id: 'venue_2',
      name: 'Pause Dome - Sandton',
      address: 'Rivonia Road, Sandton, Johannesburg',
      suburb: 'Sandton',
      maps_url: 'https://maps.google.com/?q=-26.1076,28.0537',
      notes: 'Heated dome facility for group sessions',
      active: true,
    },
  ];

  try {
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'venues'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('venues').upsert(venues);
    
    if (error) {
      return { table: 'venues', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${venues.length} venues`);
    return { table: 'venues', success: true, count: venues.length };
  } catch (err: any) {
    return { table: 'venues', success: false, count: 0, error: err.message };
  }
}

async function seedInstructors(): Promise<SeedResult> {
  console.log('\n👨‍🏫 Seeding instructors...');
  
  const instructors = [
    {
      id: 'instructor_1',
      name: 'Sarah Johnson',
      email: 'sarah@pausefmd.co.za',
      phone: '+27821234567',
      bio: 'Certified fascia movement specialist with 10+ years experience. Specializes in yoga-based recovery and flexibility training.',
      specialties: ['Yoga', 'Flexibility', 'Recovery'],
      active: true,
    },
    {
      id: 'instructor_2',
      name: 'Mike Peters',
      email: 'mike@pausefmd.co.za',
      phone: '+27829876543',
      bio: 'Former professional athlete turned movement coach. Expert in sports recovery and athletic performance.',
      specialties: ['Sports Recovery', 'Athletic Performance', 'CrossFit'],
      active: true,
    },
  ];

  try {
    // Delete existing instructors first
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'instructors'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('instructors').upsert(instructors);
    
    if (error) {
      return { table: 'instructors', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${instructors.length} instructors`);
    return { table: 'instructors', success: true, count: instructors.length };
  } catch (err: any) {
    return { table: 'instructors', success: false, count: 0, error: err.message };
  }
}

async function seedDisclaimers(): Promise<SeedResult> {
  console.log('\n📋 Seeding disclaimers...');
  
  const disclaimers = [
    {
      id: 'disclaimer_1',
      name: 'General Waiver',
      context: 'waiver',
      title: 'Participation Waiver & Release',
      intro_text: 'By participating in any Pause Fascia Movement session, you acknowledge and agree to the following:',
      sections: [
        {
          title: 'Health Declaration',
          content: 'I confirm that I am in good physical condition and have no known medical conditions that would prevent me from participating in fascia movement sessions.',
        },
        {
          title: 'Assumption of Risk',
          content: 'I understand that participation in movement activities involves inherent risks, and I voluntarily assume all risks associated with my participation.',
        },
        {
          title: 'Release of Liability',
          content: 'I hereby release and discharge Pause Fascia Movement, its instructors, and staff from any and all claims, liabilities, or damages arising from my participation.',
        },
        {
          title: 'Photography/Video',
          content: 'I consent to being photographed or recorded for promotional purposes, unless I specifically request otherwise.',
        },
      ],
      signature_required: true,
      active: true,
    },
  ];

  try {
    // Delete existing disclaimers first
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'disclaimers'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('disclaimers').upsert(disclaimers);
    
    if (error) {
      return { table: 'disclaimers', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${disclaimers.length} disclaimer`);
    return { table: 'disclaimers', success: true, count: disclaimers.length };
  } catch (err: any) {
    return { table: 'disclaimers', success: false, count: 0, error: err.message };
  }
}

async function seedCRMPipelineStages(): Promise<SeedResult> {
  console.log('\n🔄 Seeding CRM pipeline stages...');
  
  const stages = [
    {
      id: 'stage_1',
      name: 'New Inquiry',
      order: 1,
      color: '#6E7568',
      description: 'Initial contact or inquiry received',
    },
    {
      id: 'stage_2',
      name: 'Consultation',
      order: 2,
      color: '#3B82F6',
      description: 'Booked or pending consultation call',
    },
    {
      id: 'stage_3',
      name: 'Trial',
      order: 3,
      color: '#F59E0B',
      description: 'Completed trial session',
    },
    {
      id: 'stage_4',
      name: 'Active',
      order: 4,
      color: '#10B981',
      description: 'Active client',
    },
    {
      id: 'stage_5',
      name: 'Follow-up',
      order: 5,
      color: '#8B5CF6',
      description: 'Inactive client requiring follow-up',
    },
  ];

  try {
    // Delete existing stages first
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'crm_pipeline_stages'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('crm_pipeline_stages').upsert(stages);
    
    if (error) {
      return { table: 'crm_pipeline_stages', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${stages.length} pipeline stages`);
    return { table: 'crm_pipeline_stages', success: true, count: stages.length };
  } catch (err: any) {
    return { table: 'crm_pipeline_stages', success: false, count: 0, error: err.message };
  }
}

async function seedCRMEmailTemplates(): Promise<SeedResult> {
  console.log('\n📧 Seeding CRM email templates...');
  
  const templates = [
    {
      id: 'crm_template_1',
      name: 'Welcome Email',
      subject: 'Welcome to Pause Fascia Movement',
      body: `Dear {{name}},

Thank you for your interest in Pause Fascia Movement!

We're excited to help you discover the benefits of fascia-focused movement. Our approach combines science-backed techniques with personalized attention to help you move better, feel better, and perform better.

Here's what to expect:
- Personalized assessment of your movement patterns
- Customized fascia release techniques
- Take-home exercises for continued progress

If you have any questions, please don't hesitate to reach out.

Best regards,
The Pause Team`,
      category: 'welcome',
      variables: ['name', 'email', 'phone'],
    },
    {
      id: 'crm_template_2',
      name: 'Follow-up After Trial',
      subject: 'How was your trial session?',
      body: `Hi {{name}},

We hope you enjoyed your trial session with us!

We'd love to hear your feedback:
- How did you feel during the session?
- Did you notice any areas of improvement?
- Do you have any questions about our programs?

Feel free to reply to this email or give us a call.

Looking forward to hearing from you!

Best regards,
The Pause Team`,
      category: 'follow_up',
      variables: ['name', 'session_date', 'instructor'],
    },
  ];

  try {
    // Delete existing templates first
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'crm_email_templates'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('crm_email_templates').upsert(templates);
    
    if (error) {
      return { table: 'crm_email_templates', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${templates.length} CRM email templates`);
    return { table: 'crm_email_templates', success: true, count: templates.length };
  } catch (err: any) {
    return { table: 'crm_email_templates', success: false, count: 0, error: err.message };
  }
}

async function seedTemplates(): Promise<SeedResult> {
  console.log('\n📄 Seeding notification templates...');
  
  const templates = [
    {
      id: 'template_1',
      name: 'Booking Confirmation',
      sport_tags: ['General', 'Yoga', 'Running', 'Cycling'],
      body_area_tags: ['full_body', 'hips', 'lower_back'],
      active: true,
      whatsapp_body: 'Hi {{name}}! Your class "{{class_title}}" is confirmed for {{date}} at {{time}}. Venue: {{venue}}. See you there!',
      email_subject: 'Booking Confirmed - {{class_title}}',
      email_body: `Dear {{name}},

Your booking is confirmed!

Class: {{class_title}}
Date: {{date}}
Time: {{time}}
Venue: {{venue}}

Please arrive 10 minutes early to complete any necessary paperwork.

Looking forward to seeing you!

The Pause Team`,
    },
    {
      id: 'template_2',
      name: 'Class Reminder',
      sport_tags: ['General', 'Yoga', 'Running', 'Cycling'],
      body_area_tags: ['full_body', 'hips', 'lower_back'],
      active: true,
      whatsapp_body: 'Hi {{name}}! Reminder: Your class "{{class_title}}" is tomorrow at {{time}}. Venue: {{venue}}. Reply CANCEL to cancel.',
      email_subject: 'Reminder: {{class_title}} Tomorrow',
      email_body: `Hi {{name}},

Just a friendly reminder about your upcoming class:

Class: {{class_title}}
Date: {{date}}
Time: {{time}}
Venue: {{venue}}

Please let us know if you need to cancel so we can offer your spot to someone else.

See you soon!

The Pause Team`,
    },
  ];

  try {
    // Delete existing templates first
    // SECURITY: Removed delete().neq('id','') — wiped ALL rows in 'templates'. Upsert handles duplicates safely.
    
    const { error } = await supabase.from('templates').upsert(templates);
    
    if (error) {
      return { table: 'templates', success: false, count: 0, error: error.message };
    }
    
    console.log(`   ✅ Created ${templates.length} notification templates`);
    return { table: 'templates', success: true, count: templates.length };
  } catch (err: any) {
    return { table: 'templates', success: false, count: 0, error: err.message };
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Essential Data Seeding Script                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${env.toUpperCase()}`);
  console.log(`Target:      ${supabaseUrl}`);

  // SECURITY: Require explicit confirmation before writing to any database.
  // This catches accidental runs (e.g. wrong terminal, wrong .env loaded).
  console.log('\n⚠️  This script will upsert seed data into the above database.');
  console.log('   Existing rows with matching IDs will be overwritten.');
  
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const confirmed = await new Promise<boolean>((resolve) => {
    rl.question('\nType "yes" to continue, anything else to abort: ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });

  if (!confirmed) {
    console.log('\n🛑 Aborted. No data was written.');
    process.exit(0);
  }

  const startTime = Date.now();

  try {
    // Seed all data
    const seeds = await Promise.all([
      seedVenues(),
      seedInstructors(),
      seedDisclaimers(),
      seedCRMPipelineStages(),
      seedCRMEmailTemplates(),
      seedTemplates(),
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                   SEEDING COMPLETE                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log(`\n⏱️  Duration: ${duration}s`);
    
    console.log('\n📊 Results:');
    seeds.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const countText = result.success ? `${result.count} records` : result.error;
      console.log(`   ${icon} ${result.table}: ${countText}`);
    });

    const successCount = seeds.filter(s => s.success).length;
    const totalRecords = seeds.reduce((sum, s) => sum + s.count, 0);
    
    console.log(`\n🎉 Successfully seeded ${totalRecords} records in ${successCount}/${seeds.length} tables!`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Log in to the admin interface to customize the data');
    console.log('   2. Update venue addresses and contact details');
    console.log('   3. Add your own instructors and their details');
    console.log('   4. Customize email templates with your branding');
    console.log('   5. Adjust CRM pipeline stages if needed');

  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  }
}

main();
