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

async function testConnection() {
  try {
    // Test basic connection
    console.log('Testing database connection...');
    
    // Get table schema
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'sows')
      .order('ordinal_position');
    
    if (schemaError) {
      console.error('Error fetching schema:', schemaError);
      return;
    }
    
    console.log('SOW table columns:');
    schema.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Test inserting a minimal SOW
    console.log('\nTesting SOW creation...');
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
      console.error('Error creating test SOW:', insertError);
      return;
    }
    
    console.log('Successfully created test SOW:', sow.id);
    
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

testConnection(); 