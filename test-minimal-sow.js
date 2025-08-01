const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMinimalSOW() {
  try {
    console.log('Testing minimal SOW creation...');
    
    // Try with only the required fields
    const { data: sow, error: insertError } = await supabase
      .from('sows')
      .insert({
        title: 'Test SOW',
        client_name: 'Test Client',
        sow_title: 'Test SOW Title',
        status: 'draft'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating minimal SOW:', insertError);
      
      // Try to get more details about the error
      if (insertError.code) {
        console.error('Error code:', insertError.code);
      }
      if (insertError.details) {
        console.error('Error details:', insertError.details);
      }
      if (insertError.hint) {
        console.error('Error hint:', insertError.hint);
      }
      return;
    }
    
    console.log('Successfully created minimal SOW:', sow.id);
    
    // Clean up
    const { error: deleteError } = await supabase
      .from('sows')
      .delete()
      .eq('id', sow.id);
    
    if (deleteError) {
      console.error('Error deleting test SOW:', deleteError);
    } else {
      console.log('Test SOW cleaned up successfully');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMinimalSOW(); 