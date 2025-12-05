import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SOWSalesforceData } from '@/types/salesforce';

// GET: Retrieve Salesforce data for a SOW
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { id: sowId } = await params;

    if (!sowId) {
      return NextResponse.json(
        { success: false, error: 'SOW ID is required' },
        { status: 400 }
      );
    }

    // Get Salesforce data for the SOW
    const { data, error } = await supabase
      .from('sow_salesforce_data')
      .select('*')
      .eq('sow_id', sowId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return NextResponse.json({
          success: true,
          data: null
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching Salesforce data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Salesforce data' },
      { status: 500 }
    );
  }
}

// POST: Save Salesforce data for a SOW
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { id: sowId } = await params;
    const salesforceData: Partial<SOWSalesforceData> = await request.json();

    if (!sowId) {
      return NextResponse.json(
        { success: false, error: 'SOW ID is required' },
        { status: 400 }
      );
    }

    // Check if SOW exists (excluding hidden SOWs)
    const { data: sowExists, error: sowError } = await supabase
      .from('sows')
      .select('id')
      .eq('id', sowId)
      .eq('is_hidden', false)
      .single();

    if (sowError || !sowExists) {
      return NextResponse.json(
        { success: false, error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Prepare data for upsert
    const dataToUpsert = {
      sow_id: sowId,
      account_data: salesforceData.account_data || null,
      contacts_data: salesforceData.contacts_data || null,
      opportunity_data: salesforceData.opportunity_data || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert the Salesforce data
    const { data, error } = await supabase
      .from('sow_salesforce_data')
      .upsert(dataToUpsert, {
        onConflict: 'sow_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update the SOW table with the Salesforce account ID and owner information if account data is provided
    if (salesforceData.account_data?.id) {
      const updateData: Record<string, unknown> = { 
        salesforce_account_id: salesforceData.account_data.id,
        updated_at: new Date().toISOString()
      };
      
      // Add account owner information if available
      if (salesforceData.account_data.owner) {
        updateData.salesforce_account_owner_name = salesforceData.account_data.owner;
      }
      if (salesforceData.account_data.owner_email) {
        updateData.salesforce_account_owner_email = salesforceData.account_data.owner_email;
      }
      
      // Sync client_name from Salesforce if account name is available
      if (salesforceData.account_data.name) {
        updateData.client_name = salesforceData.account_data.name;
      }
      
      await supabase
        .from('sows')
        .update(updateData)
        .eq('id', sowId);
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error saving Salesforce data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save Salesforce data' },
      { status: 500 }
    );
  }
}

// PATCH: Update specific parts of Salesforce data
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { id: sowId } = await params;
    const updates: Partial<SOWSalesforceData> = await request.json();

    if (!sowId) {
      return NextResponse.json(
        { success: false, error: 'SOW ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.account_data !== undefined) {
      updateData.account_data = updates.account_data;
    }
    if (updates.contacts_data !== undefined) {
      updateData.contacts_data = updates.contacts_data;
    }
    if (updates.opportunity_data !== undefined) {
      updateData.opportunity_data = updates.opportunity_data;
    }

    // Update the Salesforce data
    const { data, error } = await supabase
      .from('sow_salesforce_data')
      .update(updateData)
      .eq('sow_id', sowId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update the SOW table with the Salesforce account ID and owner information if account data is provided
    if (updates.account_data?.id) {
      const updateData: Record<string, unknown> = { 
        salesforce_account_id: updates.account_data.id,
        updated_at: new Date().toISOString()
      };
      
      // Add account owner information if available
      if (updates.account_data.owner) {
        updateData.salesforce_account_owner_name = updates.account_data.owner;
      }
      if (updates.account_data.owner_email) {
        updateData.salesforce_account_owner_email = updates.account_data.owner_email;
      }
      
      // Sync client_name from Salesforce if account name is available
      if (updates.account_data.name) {
        updateData.client_name = updates.account_data.name;
      }
      
      await supabase
        .from('sows')
        .update(updateData)
        .eq('id', sowId);
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating Salesforce data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update Salesforce data' },
      { status: 500 }
    );
  }
} 