import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiBulletPoint {
  title: string;
  description: string;
  category: 'deliverable' | 'requirement' | 'assumption' | 'timeline';
}

interface GeminiGenerationResponse {
  bulletPoints: GeminiBulletPoint[];
  summary: string;
}



interface TranscriptionAnalysisResponse {
  objectiveOverview: string;
  painPoints: string[];
  solutions: {
    "Lead Routing": string[];
    "Account Matching": string[];
    "BookIt": string[];
    "Integrations": string[];
  };
  isFallback?: boolean;
}

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Switch to a different model (useful when one model is overloaded)
   */
  switchModel(newModelName: string) {
    this.modelName = newModelName;
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
          // Model switched
  }

  /**
   * Get available models for fallback
   */
  static getAvailableModels(): string[] {
    return [
      'gemini-2.5-flash',    // Latest and fastest model
      'gemini-1.5-flash',    // Fast, commonly overloaded
      'gemini-1.5-pro',      // More capable, sometimes less load
      'gemini-1.0-pro',      // Older model, often less load
      'gemini-pro'           // Legacy model, usually available
    ];
  }

  /**
   * Generate bullet points for SOW deliverables from call transcript
   */
  async generateSOWBulletPoints(
    transcript: string,
    customerName: string,
    projectContext?: string
  ): Promise<GeminiGenerationResponse> {
    const prompt = `
You are an expert at analyzing sales calls and extracting key information for Statement of Work (SOW) documents.

Please analyze the following call transcript between LeanData and ${customerName} and extract deliverables in a structured format.

${projectContext ? `Project Context: ${projectContext}` : ''}

Call Transcript:
${transcript}

Please provide your response in the following JSON format, organizing deliverables by category:
{
  "bulletPoints": [
    {
      "title": "LEADS",
      "description": "Deduplication of Leads against existing Leads and Contacts.\nRoute Leads to Matched Accounts.\nUse GR nodes to determine if there are open cases. If there is an open case, send notification to case owner and lead owner.\nRoute leads via GEO and Revenue to Round Robins and individuals if no account match\nSend Teams notifications on lead to account match and lead assignment",
      "category": "deliverable"
    },
    {
      "title": "CONTACTS", 
      "description": "Mimics Lead Routing\nIf contact matches open opportunities, assign contact role.",
      "category": "deliverable"
    },
    {
      "title": "INTEGRATIONS",
      "description": "Teams\nGong",
      "category": "deliverable"
    }
  ],
  "summary": "Brief summary of the key points discussed"
}

IMPORTANT: For deliverables, organize them into categories like LEADS, CONTACTS, INTEGRATIONS, etc. Each category should be a separate bullet point with the category name as the title and the specific items as the description (separated by newlines).

Focus on organizing deliverables into logical categories like LEADS, CONTACTS, INTEGRATIONS, etc. Each category should contain specific, actionable items that would be included in a professional SOW document. Be specific and avoid generic statements.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No content received from Gemini');
      }

      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          bulletPoints: parsed.bulletPoints || [],
          summary: parsed.summary || 'No summary available'
        };
      } catch {
        // If JSON parsing fails, create a fallback response
        return {
          bulletPoints: [
            {
              title: 'Transcript Analysis',
              description: content,
              category: 'deliverable'
            }
          ],
          summary: 'Analysis completed but response format was unexpected'
        };
      }
    } catch (error) {
      console.error('Error generating bullet points:', error);
      throw error;
    }
  }

  /**
   * Generate a project description from call transcript
   */
  async generateProjectDescription(
    transcript: string,
    customerName: string
  ): Promise<string> {
    const prompt = `
Based on the following call transcript between LeanData and ${customerName}, write a concise project description suitable for a Statement of Work document.

Call Transcript:
${transcript}

Please provide a professional, 2-3 sentence project description that captures the main objectives and scope discussed in the call.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'Project description could not be generated';
    } catch (error) {
      console.error('Error generating project description:', error);
      return 'Project description could not be generated due to an error';
    }
  }

  /**
   * Analyze transcription with model fallback - tries different models if one is overloaded
   */
  async analyzeTranscriptionWithFallback(
    transcript: string,
    customerName: string
  ): Promise<TranscriptionAnalysisResponse> {
    const models = GeminiClient.getAvailableModels();
    let lastError: Error | null = null;

    // Start with the current model (saved in database), then try others if needed
    const orderedModels = [
      this.modelName, // Start with the saved model
      ...models.filter(m => m !== this.modelName) // Then try other models
    ];

    for (const modelName of orderedModels) {
      try {
        // Trying model
        this.switchModel(modelName);
        
        const result = await this.analyzeTranscription(transcript, customerName);
                  // Success with model
        return result;
        
      } catch (error) {
        // Model failed, trying next
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If it's not an overload error, don't try other models
        if (error instanceof Error && 
            !error.message.includes('503 Service Unavailable') && 
            !error.message.includes('model is overloaded') &&
            !error.message.includes('Please try again later')) {
          throw error;
        }
        
        // Continue to next model for overload errors
        continue;
      }
    }
    
    // All models failed
    throw lastError || new Error('All Gemini models are currently overloaded');
  }

  /**
   * Analyze transcription and generate objective and scope
   */
  async analyzeTranscription(
    transcript: string,
    customerName: string
  ): Promise<TranscriptionAnalysisResponse> {
    // Fetch the AI prompt from the database
    const { supabase } = await import('@/lib/supabase');
    
    const { data: aiPrompt, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_content')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (promptError || !aiPrompt?.prompt_content) {
      console.warn('Failed to fetch AI prompt from database, using fallback prompt');
      // Fallback to the original hardcoded prompt
      const fallbackPrompt = `
You are an expert at analyzing sales call transcripts and extracting key information for Statement of Work (SOW) documents.

Please analyze the following call transcript between LeanData and ${customerName} and provide a comprehensive project objective and scope items.

Call Transcript:
${transcript}

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.

Required JSON format:
{
  "objective": "A clear, professional objective statement that captures the main goal of the project (3-5 sentences). The intro paragraph should utilize the customerName: {customerName} seeks to implement LeanData as part of their initiative to automate and improve their go to market processes by leveraging LeanData's Orchestration and BookIt platforms. (where the products listed are included in the project)",
  "scope": {
    "Lead Routing": [
      "Specific scope item 1 related to Lead Routing",
      "Specific scope item 2 related to Lead Routing"
    ],
    "Account Matching": [
      "Specific scope item 1 related to Account Matching",
      "Specific scope item 2 related to Account Matching"
    ],
    "BookIt": [
      "Specific scope item 1 related to BookIt",
      "Specific scope item 2 related to BookIt"
    ],
    "Integrations": [
      "Specific scope item 1 related to Integrations",
      "Specific scope item 2 related to Integrations"
    ]
  }
}

Guidelines:
- The objective should be business-focused and capture the main goal of the project
- Scope items should be specific, measurable, and aligned with typical LeanData implementation goals
- Include scope items related to lead/contact management, automation, data quality, and operational efficiency
- Focus on LeanData products and services mentioned in the call
- Be professional and suitable for a formal SOW document
- Avoid generic statements - be specific to what was discussed

- Use double quotes for all strings
- Do not include any text before or after the JSON
- Do not use markdown code blocks
- Ensure the JSON is valid and parseable
`;
      return this.executePrompt(fallbackPrompt, transcript, customerName);
    }

    // Use the prompt from the database, replacing placeholders
    const prompt = aiPrompt.prompt_content
      .replace(/\{customerName\}/g, customerName)
      .replace(/\{transcription\}/g, transcript);





    return this.executePrompt(prompt, transcript, customerName);
  }

  /**
   * Execute a prompt and parse the response
   */
  private async executePrompt(
    prompt: string,
    transcript: string,
    customerName: string
  ): Promise<TranscriptionAnalysisResponse> {
    const { 
      cleanAndParseJSON, 
      validateParsedResponse, 
      createStandardResponse, 
      extractContentFromText, 
      createFallbackResponse, 
      createErrorResponse 
    } = await import('@/lib/utils/geminiErrorHandlers');

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();



      if (!content) {
        throw new Error('No content received from Gemini');
      }

      // Try to parse the JSON response
      try {
        const parsed = cleanAndParseJSON(content);
        
        if (validateParsedResponse(parsed)) {
          return createStandardResponse(parsed, false);
        }
        
        throw new Error('Missing required fields in parsed response');
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Content that failed to parse:', content);
        
        // Try a second attempt with a simpler prompt
        try {
          const simplePrompt = `
Analyze this call transcript and return ONLY valid JSON:
{
  "objectiveOverview": "brief project overview",
  "painPoints": ["pain point 1", "pain point 2"],
  "solutions": {
    "Lead Routing": ["solution item 1", "solution item 2"],
    "Account Matching": ["solution item 1", "solution item 2"],
    "BookIt": ["solution item 1", "solution item 2"],
    "Integrations": ["solution item 1", "solution item 2"]
  }
}

Transcript: ${transcript}
Customer: ${customerName}
`;

          const secondResult = await this.model.generateContent(simplePrompt);
          const secondResponse = await secondResult.response;
          const secondContent = secondResponse.text();

          if (secondContent) {
            const cleanedContent = secondContent.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
            const finalContent = jsonMatch ? jsonMatch[0] : cleanedContent;
            
            const parsed = JSON.parse(finalContent);
            if (validateParsedResponse(parsed)) {
              return createStandardResponse(parsed, false);
            }
          }
        } catch (secondError) {
          console.error('Second attempt also failed:', secondError);
        }
        
        // Fallback to text extraction
        const { scopeItems } = extractContentFromText(content);
        return createFallbackResponse(scopeItems);
      }
    } catch (error) {
      console.error('Error analyzing transcription:', error);
      return createErrorResponse(error);
    }
  }

}

export { GeminiClient, type GeminiBulletPoint, type GeminiGenerationResponse, type TranscriptionAnalysisResponse };

// Helper function to analyze transcription
export async function analyzeTranscription(
  transcript: string, 
  customerName: string
): Promise<TranscriptionAnalysisResponse> {
  // Get API key from database
  const { supabase } = await import('@/lib/supabase');
  
  const { data: config, error } = await supabase
    .from('gemini_configs')
    .select('api_key, model_name, is_active')
    .eq('is_active', true)
    .single();

  if (error || !config?.api_key) {
    throw new Error('Gemini API key not configured. Please configure it in the admin panel.');
  }

  
      // API key validation completed
  
  // Check if API key looks like it's been masked
  if (config.api_key.includes('•') || config.api_key.includes('····')) {
    throw new Error('API key appears to be masked. Please enter the actual API key, not the masked version.');
  }

  // Use the primary API key with the saved model
  const client = new GeminiClient(config.api_key, config.model_name || 'gemini-2.5-flash');
  return await client.analyzeTranscriptionWithFallback(transcript, customerName);
} 