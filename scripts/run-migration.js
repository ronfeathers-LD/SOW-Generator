const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔧 Running database migration...');
    console.log('================================\n');

    // Migration SQL to add missing columns
    const migrationSQL = `
      -- Add the new objectives fields to the sows table
      ALTER TABLE sows 
      ADD COLUMN IF NOT EXISTS objectives_description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS objectives_key_objectives JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS avoma_transcription TEXT DEFAULT '';

      -- Verify the migration
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'sows' 
      AND column_name IN ('objectives_description', 'objectives_key_objectives', 'avoma_transcription')
      ORDER BY column_name;
    `;

    console.log('📋 Executing migration SQL...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n💡 Alternative: Run this SQL manually in your Supabase SQL Editor:');
      console.log('=====================================');
      console.log(migrationSQL);
      console.log('=====================================');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('Migration results:', data);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Please run this SQL manually in your Supabase SQL Editor:');
    console.log('=====================================');
    console.log(`
-- Add the new objectives fields to the sows table
ALTER TABLE sows 
ADD COLUMN IF NOT EXISTS objectives_description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS objectives_key_objectives JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS avoma_transcription TEXT DEFAULT '';

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'sows' 
AND column_name IN ('objectives_description', 'objectives_key_objectives', 'avoma_transcription')
ORDER BY column_name;
    `);
    console.log('=====================================');
  }
}

runMigration(); 