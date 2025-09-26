import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseApi } from '@/lib/supabase-api';
import { PDFGenerator } from '@/lib/pdf-generator';

// POST - Generate PDF for a change order
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Fetch change order data
    const { data: changeOrder, error: fetchError } = await supabaseApi
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
      .eq('id', id)
      .eq('author_id', user.id)
      .eq('is_hidden', false)
      .single();

    if (fetchError || !changeOrder) {
      console.error('❌ Failed to fetch change order data:', fetchError);
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      );
    }

    // Change order data fetched successfully
    console.log(`📄 Generating PDF for change order: ${changeOrder.change_order_number}`);

    // Initialize PDF generator
    const pdfGenerator = new PDFGenerator();
    
    try {
      await pdfGenerator.initialize();
      
      // Generate PDF for the change order
      const pdfBuffer = await pdfGenerator.generateChangeOrderPDF(changeOrder);
      
      // PDF generated successfully
      console.log(`✅ PDF generated successfully for change order: ${changeOrder.change_order_number}`);
      
      // Return the PDF as a response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="change-order-${changeOrder.change_order_number}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
      
    } catch (pdfError) {
      console.error('❌ Error during PDF generation:', pdfError);
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in change order PDF generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
