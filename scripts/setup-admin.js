const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    // Get the first user (you)
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found. Please log in first to create a user account.');
      return;
    }

    const firstUser = users[0];
    console.log(`Found user: ${firstUser.email} (${firstUser.name || 'No name'})`);

    // Update the user to admin role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', firstUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return;
    }

    console.log(`✅ Successfully set ${updatedUser.email} as admin!`);
    console.log('You can now access admin features at /admin');
    
  } catch (error) {
    console.error('Error in setup:', error);
  }
}

setupAdmin(); 