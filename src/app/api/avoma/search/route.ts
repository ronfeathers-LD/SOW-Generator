import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient, getAvomaConfig } from '@/lib/avoma';
import { GeminiClient } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { customerName, projectContext } = await request.json();

    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Get Avoma configuration from database
    const avomaConfig = await getAvomaConfig();
    
    if (!avomaConfig) {
      return NextResponse.json(
        { error: 'Avoma integration is not configured. Please contact your administrator.' },
        { status: 503 }
      );
    }

    if (!avomaConfig.is_active) {
      return NextResponse.json(
        { error: 'Avoma integration is currently disabled. Please contact your administrator.' },
        { status: 503 }
      );
    }

    // Initialize clients
    const avomaClient = new AvomaClient(avomaConfig.api_key, avomaConfig.api_url);
    const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY!);

    // Search for scoping calls
    const scopingCalls = await avomaClient.findScopingCalls(customerName);

    if (scopingCalls.length === 0) {
      return NextResponse.json({
        message: 'No scoping calls found for this customer',
        calls: [],
        bulletPoints: [],
        projectDescription: ''
      });
    }

    // Get the most recent call transcript
    const mostRecentCall = scopingCalls[0]; // Assuming they're sorted by date
    
    if (!mostRecentCall.id) {
      return NextResponse.json({
        message: 'Call found but ID is not available',
        calls: scopingCalls,
        bulletPoints: [],
        projectDescription: ''
      });
    }
    
    const transcript = await avomaClient.getCallTranscriptText(mostRecentCall.id);

    if (!transcript) {
      return NextResponse.json({
        message: 'Call found but transcript is not available',
        calls: scopingCalls,
        bulletPoints: [],
        projectDescription: ''
      });
    }

    // Generate bullet points using Gemini
    const bulletPointsResponse = await geminiClient.generateSOWBulletPoints(
      transcript,
      customerName,
      projectContext
    );

    // Generate project description
    const projectDescription = await geminiClient.generateProjectDescription(
      transcript,
      customerName
    );

    return NextResponse.json({
      message: 'Successfully analyzed scoping calls',
      calls: scopingCalls,
      selectedCall: mostRecentCall,
      bulletPoints: bulletPointsResponse.bulletPoints,
      summary: bulletPointsResponse.summary,
      projectDescription
    });

  } catch (error) {
    console.error('Error in Avoma search:', error);
    return NextResponse.json(
      { error: 'Failed to search Avoma calls' },
      { status: 500 }
    );
  }
} 