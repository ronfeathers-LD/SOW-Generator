import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient } from '@/lib/avoma';
import { analyzeTranscription } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { meetingIds, projectContext } = await request.json();

    if (!meetingIds || !Array.isArray(meetingIds) || meetingIds.length === 0) {
      return NextResponse.json(
        { error: 'Meeting IDs are required' },
        { status: 400 }
      );
    }

    // Get Avoma API key from environment or database
    const avomaApiKey = process.env.AVOMA_API_KEY;
    if (!avomaApiKey) {
      return NextResponse.json(
        { error: 'Avoma API key not configured' },
        { status: 500 }
      );
    }
    
    const avomaClient = new AvomaClient(avomaApiKey);
    const transcripts = [];
    const meetingDetails = [];

    // Fetch transcripts for each selected meeting
    for (const meetingId of meetingIds) {
      try {
        const transcript = await avomaClient.getTranscript(meetingId);
        const meeting = await avomaClient.getMeetingDetails(meetingId);
        
        transcripts.push({
          meetingId,
          transcript: transcript.transcript || '',
          hasTranscript: !!transcript.transcript
        });
        
        meetingDetails.push(meeting);
      } catch (error) {
        console.error(`Error fetching transcript for meeting ${meetingId}:`, error);
        transcripts.push({
          meetingId,
          transcript: '',
          hasTranscript: false,
          error: 'Failed to fetch transcript'
        });
      }
    }

    // Filter out meetings without transcripts
    const validTranscripts = transcripts.filter(t => t.hasTranscript);
    
    if (validTranscripts.length === 0) {
      return NextResponse.json({
        message: 'No transcripts available for selected meetings',
        bulletPoints: [],
        projectDescription: '',
        summary: 'No transcripts were available for analysis.'
      });
    }

    // Combine all transcripts for analysis
    const combinedTranscripts = validTranscripts
      .map(t => `Meeting ${t.meetingId}:\n${t.transcript}`)
      .join('\n\n---\n\n');

    // Generate bullet points and project description using the existing analyzeTranscription function
    const analysisResult = await analyzeTranscription(
      combinedTranscripts,
      'Customer', // We'll need to pass the actual customer name
      undefined, // selectedProducts
      undefined, // existingDescription
      undefined, // existingObjectives
      projectContext // supportingDocuments (using projectContext here)
    );

    // Create a summary
    const summary = `Analyzed ${validTranscripts.length} meeting transcript${validTranscripts.length > 1 ? 's' : ''} and generated objectives and solutions.`;

    // Convert TranscriptionAnalysisResponse to the expected format
    const bulletPoints = [
      {
        title: "Objective Overview",
        description: analysisResult.objectiveOverview,
        category: "objectives"
      },
      ...analysisResult.overcomingActions.map(action => ({
        title: "Overcoming Action",
        description: action,
        category: "actions"
      })),
      ...Object.entries(analysisResult.solutions).flatMap(([category, solutions]) =>
        solutions.map(solution => ({
          title: category,
          description: solution,
          category: "solutions"
        }))
      )
    ];

    return NextResponse.json({
      message: `Successfully analyzed ${validTranscripts.length} meeting transcript${validTranscripts.length > 1 ? 's' : ''}`,
      bulletPoints,
      projectDescription: analysisResult.objectiveOverview,
      summary,
      transcripts: transcripts.map(t => ({
        meetingId: t.meetingId,
        hasTranscript: t.hasTranscript,
        error: t.error
      }))
    });

  } catch (error) {
    console.error('Error in transcripts endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process transcripts' },
      { status: 500 }
    );
  }
}
