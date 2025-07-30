import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.AVOMA_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { meetingUuid } = await request.json();

    if (!meetingUuid) {
      return NextResponse.json({ error: 'Meeting UUID is required' }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json({ error: 'Avoma API key not configured' }, { status: 500 });
    }

    // Get the meeting details
    const meetingResponse = await fetch(`https://api.avoma.com/v1/meetings/${meetingUuid}/`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meetingResponse.ok) {
      if (meetingResponse.status === 404) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      throw new Error(`Failed to fetch meeting: ${meetingResponse.statusText}`);
    }

    const meeting = await meetingResponse.json();

    // Provide clear instructions for accessing transcription
    const transcriptionInstructions = `To access the transcription for this meeting:

1. Visit the meeting URL: ${meeting.url}
2. Log in to your Avoma account if prompted
3. Navigate to the "Transcript" or "Transcription" tab
4. Copy the transcription text
5. Paste it into the transcription field below

Note: The Avoma API does not provide direct access to transcription content. You'll need to manually copy the transcription from the web interface.`;

    return NextResponse.json({
      transcription: transcriptionInstructions,
      meeting: {
        subject: meeting.subject,
        start_at: meeting.start_at,
        attendees: meeting.attendees?.map((a: any) => a.name).join(', '),
        transcript_ready: meeting.transcript_ready,
        duration: meeting.duration ? Math.round(meeting.duration / 60) : null
      }
    });

  } catch (error) {
    console.error('Error fetching Avoma meeting details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting details' },
      { status: 500 }
    );
  }
} 