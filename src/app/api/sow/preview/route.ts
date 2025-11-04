import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AvomaClient, getAvomaConfig } from '@/lib/avoma';
import { analyzeTranscription } from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface PreviewRequest {
  meetingIds: string[];
  accountName: string;
  opportunityName?: string;
  salesforceAccountId?: string;
  salesforceOpportunityId?: string;
}

/**
 * Auto-detect products mentioned in transcriptions using AI
 * This is more accurate than keyword matching as it understands context and variations
 */
async function detectProductsFromTranscription(
  combinedTranscript: string,
  allProducts: Array<{ name: string }>
): Promise<string[]> {
  // If no products in database, return empty
  if (!allProducts || allProducts.length === 0) {
    return [];
  }

  // Get Gemini configuration
  const supabase = await createServerSupabaseClient();
  const { data: configs, error } = await supabase
    .from('gemini_configs')
    .select('api_key, model_name, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !configs || configs.length === 0) {
    console.warn('Gemini config not available, falling back to keyword matching');
    return detectProductsByKeyword(combinedTranscript, allProducts);
  }

  const config = configs[0];
  if (!config?.api_key || config.api_key.includes('•') || config.api_key.includes('····')) {
    console.warn('Invalid Gemini API key, falling back to keyword matching');
    return detectProductsByKeyword(combinedTranscript, allProducts);
  }

  try {
    // Create product list for the prompt
    const productList = allProducts.map(p => p.name).join(', ');
    
    // Use AI to detect products from transcript
    const genAI = new GoogleGenerativeAI(config.api_key);
    const model = genAI.getGenerativeModel({ model: config.model_name || 'gemini-2.5-flash' });
    
    const prompt = `You are analyzing a sales call transcription to identify which LeanData products were discussed.

Available products: ${productList}

Transcription:
${combinedTranscript.substring(0, 100000)} ${combinedTranscript.length > 100000 ? '[... transcript truncated for product detection ...]' : ''}

Please analyze the transcription and identify which products from the list above were mentioned, discussed, or implied. Consider:
- Exact product name mentions
- Common variations or nicknames (e.g., "Lead Router" = "Lead Routing", "BookIt Forms" = "BookIt for Forms")
- Context clues (e.g., "routing leads" might indicate "Lead Routing")
- Related functionality discussions that imply a product

Respond with ONLY a JSON array of product names that exactly match the available products list. Do not include products not in the list. If no products were clearly mentioned, return an empty array [].

Example response format:
["Lead Routing", "BookIt for Forms"]

Response (JSON array only, no other text):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse JSON response
    let cleanedContent = content.trim();
    // Remove markdown code blocks if present
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Extract JSON array if there's extra text
    const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    const detectedProducts = JSON.parse(cleanedContent);
    
    // Validate that detected products are in our product list
    const validProducts = allProducts.map(p => p.name);
    const validDetected = detectedProducts.filter((product: string) => 
      validProducts.includes(product)
    );

    return validDetected;
  } catch (error) {
    console.error('Error using AI for product detection, falling back to keyword matching:', error);
    return detectProductsByKeyword(combinedTranscript, allProducts);
  }
}

/**
 * Fallback keyword-based product detection
 */
function detectProductsByKeyword(
  combinedTranscript: string,
  allProducts: Array<{ name: string }>
): string[] {
  const transcriptLower = combinedTranscript.toLowerCase();
  const detectedProducts: string[] = [];
  
  // Create a map of product names and common aliases
  const productAliases: Record<string, string[]> = {
    'Lead Routing': ['lead routing', 'lead router', 'routing leads', 'lead routing solution'],
    'Contact Routing': ['contact routing', 'contact router', 'routing contacts', 'contact routing solution'],
    'Account Routing': ['account routing', 'account router', 'routing accounts'],
    'Opportunity Routing': ['opportunity routing', 'opp routing', 'opp router', 'opportunity router'],
    'Case Routing': ['case routing', 'case router', 'routing cases'],
    'Any Object Routing': ['any object routing', 'object routing', 'custom object routing'],
    'Lead to Account Matching': ['lead to account', 'lead to account matching', 'lta', 'lead account matching', 'match leads to accounts'],
    'BookIt for Forms': ['bookit forms', 'bookit for forms', 'bookit form', 'forms', 'bookit'],
    'BookIt Links': ['bookit links', 'bookit link', 'links'],
    'BookIt Handoff': ['bookit handoff', 'bookit handoff with smartrep', 'bookit handoff without smartrep', 'handoff'],
    'MultiGraph': ['multigraph', 'multi graph', 'multi-graph'],
    'NotifyPlus': ['notifyplus', 'notify plus', 'notify-plus'],
  };

  // Check each product
  for (const product of allProducts) {
    const productName = product.name;
    const aliases = productAliases[productName] || [];
    
    // Add the exact product name to aliases
    const allVariations = [productName.toLowerCase(), ...aliases];
    
    // Check for any variation
    const isMentioned = allVariations.some(variation => {
      // Use word boundaries for better matching
      const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
      return pattern.test(transcriptLower);
    });
    
    if (isMentioned) {
      detectedProducts.push(product.name);
    }
  }
  
  return detectedProducts;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Destructure request - some fields kept for future use
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      meetingIds,
      accountName,
      opportunityName: _opportunityName,
      salesforceAccountId: _salesforceAccountId,
      salesforceOpportunityId: _salesforceOpportunityId
    }: PreviewRequest = await request.json();
    /* eslint-enable @typescript-eslint/no-unused-vars */

    if (!meetingIds || !Array.isArray(meetingIds) || meetingIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one meeting ID is required' },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    // Get Avoma configuration
    const avomaConfig = await getAvomaConfig();
    if (!avomaConfig || !avomaConfig.is_active) {
      return NextResponse.json(
        { error: 'Avoma integration is not configured or disabled' },
        { status: 503 }
      );
    }

    // Initialize Avoma client
    const avomaClient = new AvomaClient(avomaConfig.api_key, avomaConfig.api_url);

    // Fetch transcriptions for selected meetings
    const transcriptions: Array<{ meetingId: string; title: string; transcript: string }> = [];
    
    for (const meetingId of meetingIds) {
      try {
        // Get meeting details first
        const meeting = await avomaClient.getMeeting(meetingId);
        
        if (!meeting.transcript_ready) {
          console.warn(`Meeting ${meetingId} does not have transcript ready`);
          continue;
        }

        // Get transcript
        const transcriptUuid = meeting.transcription_uuid || meetingId;
        const transcriptResult = await avomaClient.getMeetingTranscriptText(transcriptUuid);
        
        if (transcriptResult.text) {
          transcriptions.push({
            meetingId,
            title: meeting.subject || `Meeting ${meetingId}`,
            transcript: transcriptResult.text
          });
        }
      } catch (error) {
        console.error(`Error fetching transcript for meeting ${meetingId}:`, error);
        // Continue with other meetings even if one fails
      }
    }

    if (transcriptions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transcriptions found for selected meetings' },
        { status: 400 }
      );
    }

    // Combine all transcriptions with clear separators
    const combinedTranscript = transcriptions
      .map((t, index) => `=== ${t.title || `Meeting ${index + 1}`} ===\n${t.transcript}\n\n`)
      .join('');

    // Auto-detect products from transcriptions
    const supabase = await createServerSupabaseClient();
    const { data: allProducts } = await supabase
      .from('products')
      .select('name')
      .eq('is_active', true);
    
    const detectedProducts = allProducts && allProducts.length > 0
      ? await detectProductsFromTranscription(combinedTranscript, allProducts)
      : [];

    // Analyze transcription using the stored prompt
    const analysisResult = await analyzeTranscription(
      combinedTranscript,
      accountName,
      detectedProducts.length > 0 ? detectedProducts : undefined,
      undefined, // No existing description
      undefined, // No existing objectives
      undefined  // No supporting documents for preview
    );

    // Return preview data (same structure as regular analysis)
    return NextResponse.json({
      success: true,
      preview: {
        customerName: analysisResult.customerName,
        objectiveOverview: analysisResult.objectiveOverview,
        overcomingActions: analysisResult.overcomingActions,
        solutions: analysisResult.solutions,
        detectedProducts: detectedProducts,
        transcriptionsUsed: transcriptions.length,
        meetingTitles: transcriptions.map(t => t.title)
      }
    });

  } catch (error) {
    console.error('Error generating SOW preview:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate SOW preview' },
      { status: 500 }
    );
  }
}

