require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Supabase Configuration (from .env.local)...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Current Configuration:');
console.log(`   Supabase URL: ${supabaseUrl || '❌ NOT SET'}`);
console.log(`   Anon Key: ${anonKey ? (anonKey.includes('your-supabase-anon-key-here') ? '❌ PLACEHOLDER' : '✅ SET') : '❌ NOT SET'}`);
console.log(`   Service Key: ${serviceKey ? (serviceKey.includes('your-service-role-key-here') ? '❌ PLACEHOLDER' : '✅ SET') : '❌ NOT SET'}`);

if (!serviceKey) {
  console.log('\n🚨 ISSUE DETECTED:');
  console.log('   The SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
  console.log('   This is why SOW creation is failing.');
  
  console.log('\n🔧 TO FIX THIS:');
  console.log('   1. Go to your Supabase project dashboard:');
  console.log(`      ${supabaseUrl}/settings/api`);
  console.log('   2. Copy the "service_role" key (not the anon key)');
  console.log('   3. Add it to your .env.local file:');
  console.log('      SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"');
  console.log('   4. Restart your development server');
  
  console.log('\n📝 Example .env.local addition:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('   - The service role key should be kept secret');
  console.log('   - Never commit it to version control');
  console.log('   - It\'s used for server-side operations like creating SOWs');
} else if (serviceKey.includes('your-service-role-key-here')) {
  console.log('\n🚨 ISSUE DETECTED:');
  console.log('   The service role key is still using a placeholder value.');
  console.log('   Please replace it with the actual key from Supabase.');
} else {
  console.log('\n✅ Configuration looks good!');
  console.log('   If you\'re still having issues, it might be a different problem.');
}

if (!supabaseUrl) {
  console.log('\n❌ ERROR: Supabase URL is not set!');
  console.log('   Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL is set.');
} 