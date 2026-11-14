import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient } from '@/lib/avoma';
import { analyzeTranscription } from '@/lib/gemini';
import { solutionsToDeliverablesText } from '@/lib/sow/svf-content';
import { createLimiter } from '@/lib/utils/map-with-concurrency';

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
    // Fetch transcripts for the selected meetings; at most 5 Avoma calls are in
    // flight at once and results stay in meetingIds order.
    const limit = createLimiter();
    const transcripts = await Promise.all((meetingIds as string[]).map(async (meetingId): Promise<{
      meetingId: string;
      transcript: string;
      hasTranscript: boolean;
      error?: string;
    }> => {
      try {
        // Details are not used downstream, but a failure here has always marked
        // the meeting as failed, so the call stays.
        const [transcript] = await Promise.all([
          limit(() => avomaClient.getTranscript(meetingId)),
          limit(() => avomaClient.getMeetingDetails(meetingId))
        ]);

        return {
          meetingId,
          transcript: transcript.transcript || '',
          hasTranscript: !!transcript.transcript
        };
      } catch (error) {
        console.error(`Error fetching transcript for meeting ${meetingId}:`, error);
        return {
          meetingId,
          transcript: '',
          hasTranscript: false,
          error: 'Failed to fetch transcript'
        };
      }
    }));

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

    // Solutions may be the legacy flat map OR the new pillar array (back-compat,
    // see src/lib/sow/svf-pillars.ts SolutionsField). The shared builder handles
    // both shapes and returns formatted lines (pillar/product headers + bullets).
    const deliverableLines = solutionsToDeliverablesText(analysisResult.solutions);

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
      ...deliverableLines.map(line => ({
        title: "Solutions",
        description: line,
        category: "solutions"
      }))
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
