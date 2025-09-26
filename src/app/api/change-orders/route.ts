import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseApi } from '@/lib/supabase-api';
import { ChangeOrderCreationRequest, ChangeOrderData } from '@/types/sow';

// GET - Fetch all change orders for the authenticated user
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch change orders with SOW information
    const { data: changeOrders, error } = await supabaseApi
      .from('change_orders')
      .select(`
        *,
        sows!inner(
          id,
          sow_title,
          client_name,
          start_date,
          template
        )
      `)
      .eq('author_id', user.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching change orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch change orders' },
        { status: 500 }
      );
    }

    return NextResponse.json(changeOrders);
  } catch (error) {
    console.error('Error in change orders GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new change order
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's ID from the users table
    const { data: user, error: userError } = await supabaseApi
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: ChangeOrderCreationRequest = await request.json();
    const {
      sow_id,
      change_requestor,
      change_categories,
      reason_for_change,
      change_description,
      new_start_date,
      new_end_date,
      associated_po,
      pricing_roles
    } = body;

    // Validate required fields
    if (!sow_id || !change_requestor || !reason_for_change || !change_description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch the original SOW to get data for inheritance
    const { data: sow, error: sowError } = await supabaseApi
      .from('sows')
      .select('*')
      .eq('id', sow_id)
      .single();

    if (sowError || !sow) {
      console.error('Error fetching SOW:', sowError);
      return NextResponse.json(
        { error: 'SOW not found' },
        { status: 404 }
      );
    }

    // Get all change orders for this SOW to find the highest number (including hidden ones)
    const { data: existingChangeOrders, error: countError } = await supabaseApi
      .from('change_orders')
      .select('change_number, change_order_number')
      .eq('sow_id', sow_id);

    if (countError) {
      console.error('Error fetching change order count:', countError);
      return NextResponse.json(
        { error: 'Failed to generate change order number' },
        { status: 500 }
      );
    }

    const nextChangeNumber = existingChangeOrders?.length > 0 
      ? Math.max(...existingChangeOrders.map(co => co.change_number)) + 1
      : 1;
    const changeOrderNumber = `CO#${nextChangeNumber.toString().padStart(2, '0')}`;

    // Double-check that this change order number doesn't already exist (including hidden ones)
    const { data: existingWithSameNumber, error: duplicateError } = await supabaseApi
      .from('change_orders')
      .select('id, is_hidden')
      .eq('sow_id', sow_id)
      .eq('change_order_number', changeOrderNumber);

    if (duplicateError) {
      console.error('Error checking for duplicate change order number:', duplicateError);
      return NextResponse.json(
        { error: 'Failed to validate change order number' },
        { status: 500 }
      );
    }

    if (existingWithSameNumber && existingWithSameNumber.length > 0) {
      return NextResponse.json(
        { error: `Change order number ${changeOrderNumber} already exists for this SOW` },
        { status: 409 }
      );
    }

    // Extract signer information from SOW
    const clientSignerName = sow.template?.customer_signature_name || sow.client_signer_name || '';
    const clientSignerTitle = sow.template?.customer_signature || sow.client_title || '';
    const clientSignerEmail = sow.template?.customer_email || sow.client_email || '';
    
    const leandataSignerName = sow.template?.lean_data_name || sow.leandata_name || '';
    const leandataSignerTitle = sow.template?.lean_data_title || sow.leandata_title || '';
    const leandataSignerEmail = sow.template?.lean_data_email || sow.leandata_email || '';

    // Extract project name from SOW
    const projectName = sow.sow_title || 'Project';

    // Extract order form date (use signature date or created date)
    const orderFormDate = sow.signature_date || sow.created_at;

    // Extract original dates from SOW
    const originalStartDate = sow.start_date;
    const originalEndDate = sow.template?.timeline_weeks ? 
      new Date(new Date(sow.start_date).getTime() + (parseInt(sow.template.timeline_weeks) * 7 * 24 * 60 * 60 * 1000)) :
      null;

    // Calculate total change amount from pricing roles
    const totalChangeAmount = pricing_roles?.reduce((sum, role) => sum + role.totalCost, 0) || 0;

    // Create the change order
    const changeOrderData: Partial<ChangeOrderData> = {
      sow_id,
      change_order_number: changeOrderNumber,
      change_number: nextChangeNumber,
      change_requestor,
      change_categories,
      reason_for_change,
      change_description,
      project_name: projectName,
      original_start_date: originalStartDate,
      original_end_date: originalEndDate || undefined,
      new_start_date: new_start_date,
      new_end_date: new_end_date,
      client_signer_name: clientSignerName,
      client_signer_title: clientSignerTitle,
      client_signer_email: clientSignerEmail,
      leandata_signer_name: leandataSignerName,
      leandata_signer_title: leandataSignerTitle,
      leandata_signer_email: leandataSignerEmail,
      order_form_date: orderFormDate,
      associated_po: associated_po || 'N/A',
      pricing_roles: pricing_roles || [],
      total_change_amount: totalChangeAmount,
      status: 'draft',
      author_id: user.id
    };

    const { data: changeOrder, error: insertError } = await supabaseApi
      .from('change_orders')
      .insert(changeOrderData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating change order:', insertError);
      return NextResponse.json(
        { error: 'Failed to create change order' },
        { status: 500 }
      );
    }

    return NextResponse.json(changeOrder, { status: 201 });
  } catch (error) {
    console.error('Error in change orders POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
