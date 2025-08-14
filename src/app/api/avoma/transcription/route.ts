import { NextRequest, NextResponse } from 'next/server';
import { AvomaClient, getAvomaConfig } from '@/lib/avoma';
import { logRequest } from '@/lib/simple-api-logger';
 
export async function POST(request: NextRequest) {
  // Log the entire request to the database
  await logRequest(request);
  
  try {
    const { meetingUuid, avomaUrl } = await request.json();

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

    let uuid = meetingUuid;

    // If avomaUrl is provided, extract the UUID from it
    if (avomaUrl && !uuid) {
      const urlMatch = avomaUrl.match(/\/meetings\/([a-f0-9-]+)/);
      if (urlMatch) {
        uuid = urlMatch[1];
      } else {
        return NextResponse.json({ error: 'Invalid Avoma URL format' }, { status: 400 });
      }
    }

    if (!uuid) {
      return NextResponse.json({ error: 'Meeting UUID is required' }, { status: 400 });
    }

    // Initialize Avoma client
    const avomaClient = new AvomaClient(avomaConfig.api_key, avomaConfig.api_url);

    try {
      // First, get the meeting details to check if transcript is ready
      const meeting = await avomaClient.getMeeting(uuid);
      
      if (!meeting.transcript_ready) {
        return NextResponse.json({
          error: 'Transcript is not ready for this meeting',
          meeting: {
            subject: meeting.subject,
            start_at: meeting.start_at,
            attendees: meeting.attendees?.map((a: unknown) => (a as { name: string }).name).join(', '),
            transcript_ready: meeting.transcript_ready,
            duration: meeting.duration ? Math.round(meeting.duration / 60) : null
          }
        }, { status: 400 });
      }

      // Try to get the transcript content using the transcriptions endpoint
      let transcriptContent = '';
      let speakers: unknown[] = [];
      
      try {
        // Check if we have a specific transcription UUID
        const transcriptUuid = meeting.transcription_uuid || uuid;
        
        // Use the new client method for meeting transcripts
        const transcriptResult = await avomaClient.getMeetingTranscriptText(transcriptUuid);
        
        transcriptContent = transcriptResult.text;
        speakers = transcriptResult.speakers;
        
      } catch (transcriptError) {
        console.error('Meeting transcript endpoint failed:', transcriptError);
      }

      // If we couldn't get the transcript content, try the old method as fallback
      if (!transcriptContent) {
        try {
          // Try using the call transcript endpoint if we have a call ID
          if (meeting.id) {
            transcriptContent = await avomaClient.getCallTranscriptText(meeting.id);
          }
        } catch (fallbackError) {
          console.error('Fallback transcript method also failed:', fallbackError);
        }
      }

      // If we still couldn't get the transcript content, provide instructions
      if (!transcriptContent) {
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
            attendees: meeting.attendees?.map((a: unknown) => (a as { name: string }).name).join(', '),
            transcript_ready: meeting.transcript_ready,
            duration: meeting.duration ? Math.round(meeting.duration / 60) : null,
            url: meeting.url
          }
        });
      }

      // Return the actual transcript content with speaker information
      return NextResponse.json({
        transcription: transcriptContent,
        speakers: speakers,
        meeting: {
          subject: meeting.subject,
          start_at: meeting.start_at,
          attendees: meeting.attendees?.map((a: unknown) => (a as { name: string }).name).join(', '),
          transcript_ready: meeting.transcript_ready,
          duration: meeting.duration ? Math.round(meeting.duration / 60) : null,
          url: meeting.url
        }
      });

    } catch (meetingError) {
      console.error('Error fetching meeting details:', meetingError);
      
      if (meetingError instanceof Error && meetingError.message.includes('404')) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      
      throw meetingError;
    }

  } catch (error) {
    console.error('Error in Avoma transcription API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
} 