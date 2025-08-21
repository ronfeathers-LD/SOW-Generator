import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeTranscription } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { transcript, customerName, selectedProducts, existingDescription, existingObjectives } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcription is required' }, { status: 400 });
    }

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const result = await analyzeTranscription(
      transcript, 
      customerName, 
      selectedProducts, 
      existingDescription, 
      existingObjectives
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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service is not properly configured. Please contact your administrator.' },
          { status: 500 }
        );
      }
      if (error.message.includes('No content received')) {
        return NextResponse.json(
          { error: 'The AI service did not return a response. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze transcription. Please try again or contact support if the issue persists.' },
      { status: 500 }
    );
  }
} 