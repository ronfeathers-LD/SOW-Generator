import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveGeminiTestKey } from '@/lib/gemini-test-key';

const DEFAULT_MODEL = 'gemini-2.5-flash';

// POST - Validate a Gemini API key + model by making a minimal live call.
// Used by the admin "Test Connection" button. Tests the form's apiKey/modelName
// when useFormData is set, otherwise the stored active config; a masked or empty
// apiKey falls back to the stored key (see resolveGeminiTestKey).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { apiKey, modelName } = body as { apiKey?: string; modelName?: string };

    const supabase = await createServerSupabaseClient();
    const { data: storedConfig } = await supabase
      .from('gemini_configs')
      .select('id, api_key, model_name')
      .eq('is_active', true)
      .single();

    const effectiveKey = resolveGeminiTestKey(apiKey, storedConfig?.api_key);
    if (!effectiveKey) {
      return NextResponse.json(
        { error: 'No API key to test. Enter a key or save one first.' },
        { status: 400 }
      );
    }

    const effectiveModel = modelName?.trim() || storedConfig?.model_name || DEFAULT_MODEL;

    let testError: string | null = null;
    try {
      const genAI = new GoogleGenerativeAI(effectiveKey);
      const model = genAI.getGenerativeModel({ model: effectiveModel });
      const result = await model.generateContent('Reply with exactly: OK');
      const text = result.response.text().trim();
      if (!text) {
        testError = 'The Gemini API returned an empty response.';
      }
    } catch (err) {
      testError = err instanceof Error ? err.message : 'Unknown error contacting Gemini.';
    }

    // Best-effort: record the test outcome on the active config for diagnostics.
    if (storedConfig?.id) {
      try {
        await supabase
          .from('gemini_configs')
          .update({ last_tested: new Date().toISOString(), last_error: testError })
          .eq('id', storedConfig.id);
      } catch (updateErr) {
        console.error('Failed to record Gemini test outcome:', updateErr);
      }
    }

    if (testError) {
      // Surface auth/key problems as a 400 (actionable), other failures as 502.
      const isKeyProblem = /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(testError);
      return NextResponse.json(
        { error: `Gemini test failed: ${testError}`, model: effectiveModel },
        { status: isKeyProblem ? 400 : 502 }
      );
    }

    return NextResponse.json({ success: true, model: effectiveModel });
  } catch (error) {
    console.error('Error testing Gemini connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
