import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeTranscription } from '@/lib/gemini';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { transcript, customerName, selectedProducts, existingDescription, existingObjectives, supportingDocuments } = await request.json();
    
    // Sort products by database sort_order if we have products
    let sortedProducts = selectedProducts;
    if (selectedProducts && selectedProducts.length > 0) {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Fetch products with their sort_order to maintain proper order
        // Check if selectedProducts contains IDs (UUIDs) or names
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const firstProduct = selectedProducts[0];
        const isUsingIds = isUUID.test(firstProduct);
        
        const { data: productsWithOrder, error } = await supabase
          .from('products')
          .select('name, sort_order')
          .in(isUsingIds ? 'id' : 'name', selectedProducts)
          .order('sort_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching product order:', error);
        } else if (productsWithOrder && productsWithOrder.length > 0) {
          // Use the database order
          sortedProducts = productsWithOrder.map(p => p.name);
        }
      } catch (dbError) {
        console.error('Database error during product ordering:', dbError);
      }
    }

    if (!transcript) {
      return NextResponse.json({ error: 'Transcription is required' }, { status: 400 });
    }

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const result = await analyzeTranscription(
      transcript, 
      customerName, 
      sortedProducts, 
      existingDescription, 
      existingObjectives,
      supportingDocuments
    );

    // Check if the result contains an error
    if (result.error) {
      console.error('Gemini returned error for customer:', customerName, result.error);
      return NextResponse.json(
        { error: `AI analysis failed: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error analyzing transcription:', error);
    
    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // API key and configuration issues
      if (errorMessage.includes('api key') || errorMessage.includes('not configured')) {
        return NextResponse.json(
          { error: 'AI service is not properly configured. Please contact your administrator.' },
          { status: 500 }
        );
      }
      
      // Model overload issues
      if (errorMessage.includes('overloaded') || errorMessage.includes('503') || errorMessage.includes('service unavailable')) {
        return NextResponse.json(
          { error: 'AI service is currently overloaded. Please try again in a few minutes.' },
          { status: 503 }
        );
      }
      
      // Response parsing issues
      if (errorMessage.includes('parse') || errorMessage.includes('json') || errorMessage.includes('response')) {
        return NextResponse.json(
          { error: 'AI response could not be processed. Please try again or contact support.' },
          { status: 500 }
        );
      }
      
      // Network and timeout issues
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        return NextResponse.json(
          { error: 'Network error occurred. Please check your connection and try again.' },
          { status: 500 }
        );
      }
      
      // Rate limiting issues
      if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      // No content received
      if (errorMessage.includes('no content received')) {
        return NextResponse.json(
          { error: 'The AI service did not return a response. Please try again.' },
          { status: 500 }
        );
      }
      
      // Database configuration issues
      if (errorMessage.includes('no active ai prompts found') || errorMessage.includes('failed to fetch ai prompt')) {
        return NextResponse.json(
          { error: 'AI prompt configuration is missing. Please check the admin panel.' },
          { status: 500 }
        );
      }
      
      // Log the specific error for debugging
      console.error('Specific error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze transcription. Please try again or contact support if the issue persists.' },
      { status: 500 }
    );
  }
} 