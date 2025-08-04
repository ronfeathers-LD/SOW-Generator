import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, modelName, useFormData } = body;

    let testApiKey: string;
    let testModelName: string = 'gemini-1.5-flash'; // Default fallback

    if (useFormData && apiKey) {
      // Use the API key and model from the form for testing
      testApiKey = apiKey;
      testModelName = modelName || 'gemini-1.5-flash';
    } else {
      // Get the stored configuration from the database
      const { data: config, error: configError } = await supabase
        .from('gemini_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (configError || !config) {
        return NextResponse.json(
          { error: 'No active Gemini configuration found. Please save your configuration first.' },
          { status: 400 }
        );
      }

      testApiKey = config.api_key;
      testModelName = config.model_name || 'gemini-1.5-flash';
    }

    if (!testApiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Debug API key format
    console.log('🔍 Test API Key Debug:');
    console.log('  - Length:', testApiKey.length);
    console.log('  - First 10 chars:', testApiKey.substring(0, 10));
    console.log('  - Last 10 chars:', testApiKey.substring(testApiKey.length - 10));
    console.log('  - Contains invalid chars:', /[^\x00-\x7F]/.test(testApiKey));
    console.log('  - Contains bullet points:', testApiKey.includes('•'));
    console.log('  - Contains dots:', testApiKey.includes('····'));
    console.log('  - Using model:', testModelName);
    
    // Check if API key looks like it's been masked
    if (testApiKey.includes('•') || testApiKey.includes('····')) {
      return NextResponse.json({
        error: 'API key appears to be masked. Please enter the actual API key, not the masked version.'
      }, { status: 400 });
    }

    try {
      // Test with a sample transcription
      const testTranscription = `
        Hi, this is a test call with BlueBeam. We discussed implementing LeanData for lead routing and account matching.
        The project will involve setting up automated lead assignment based on territory and revenue, implementing
        deduplication for leads and contacts, and integrating with their existing Salesforce workflows.
        We also talked about training their team and providing documentation.
      `;

      // Create a temporary Gemini client with the test API key and saved model
      const { GeminiClient } = await import('@/lib/gemini');
      const tempClient = new GeminiClient(testApiKey, testModelName);
      const result = await tempClient.analyzeTranscriptionWithFallback(testTranscription, 'BlueBeam');

      // Update the last_tested timestamp in the database
      if (!useFormData) {
        await supabase
          .from('gemini_configs')
          .update({ 
            last_tested: new Date().toISOString(),
            last_error: null
          })
          .eq('is_active', true);
      }

      return NextResponse.json({
        success: true,
        message: 'Gemini API connection successful!',
        testResult: {
          objectiveOverview: result.objectiveOverview,
          keyObjectivesCount: result.keyObjectives.length,
          deliverablesCount: result.deliverables.length
        }
      });

    } catch (error) {
      console.error('Error testing Gemini API:', error);

      // Update the last_error in the database
      if (!useFormData) {
        await supabase
          .from('gemini_configs')
          .update({ 
            last_tested: new Date().toISOString(),
            last_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('is_active', true);
      }

      if (error instanceof Error && error.message.includes('API key not valid')) {
        return NextResponse.json({
          error: 'Invalid API key. Please check your Gemini API key and try again.'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: 'Failed to test Gemini API connection. Please check your API key and try again.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in Gemini test endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to test Gemini API connection' },
      { status: 500 }
    );
  }
} 