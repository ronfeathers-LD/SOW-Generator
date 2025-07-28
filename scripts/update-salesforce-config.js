const { createClient } = require('@supabase/supabase-js');

// Get environment variables from process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateSalesforceConfig() {
  try {
    console.log('🔧 Salesforce Configuration Update Tool');
    console.log('=====================================\n');

    // Get current configuration
    const { data: currentConfig } = await supabase
      .from('salesforce_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (currentConfig) {
      console.log('📋 Current Configuration:');
      console.log(`Username: ${currentConfig.username}`);
      console.log(`Login URL: ${currentConfig.login_url}`);
      console.log(`Has Security Token: ${!!currentConfig.security_token}`);
      console.log(`Last Error: ${currentConfig.last_error || 'None'}\n`);
    } else {
      console.log('❌ No active Salesforce configuration found.\n');
    }

    console.log('🔑 To get a new Security Token:');
    console.log('1. Log into Salesforce');
    console.log('2. Go to Settings → My Personal Information → Reset My Security Token');
    console.log('3. Click "Reset Security Token"');
    console.log('4. Check your email for the new token\n');

    console.log('📝 Update your configuration at:');
    console.log('https://sow-generator-eta.vercel.app/admin/salesforce\n');

    console.log('💡 Common Issues:');
    console.log('- Password expired (change in Salesforce)');
    console.log('- Security token expired (reset in Salesforce)');
    console.log('- Account locked (contact Salesforce admin)');
    console.log('- Wrong username (check for typos)\n');

    console.log('🔍 Debug Info:');
    console.log('- The error shows username: ron.feathers@leandata.com');
    console.log('- Backup shows username: ron.feathers+dev@leandata.com');
    console.log('- Make sure you\'re using the correct username!');

  } catch (error) {
    console.error('Error:', error);
  }
}

updateSalesforceConfig(); 