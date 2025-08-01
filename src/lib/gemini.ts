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

interface ObjectivesGenerationRequest {
  customerName: string;
  projectDescription: string;
  products: string;
}

interface ObjectivesGenerationResponse {
  description: string;
  objectives: string[];
}

interface TranscriptionAnalysisResponse {
  objective: string;
  scope: string[];
}

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
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
      'gemini-1.5-flash',    // Fastest, most commonly overloaded
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

Please analyze the following call transcript between LeanData and ${customerName} and extract:

1. **Deliverables** - Specific products, services, or outcomes that will be delivered
2. **Requirements** - Technical or business requirements mentioned
3. **Assumptions** - Assumptions made during the conversation
4. **Timeline** - Any timeline or scheduling information

${projectContext ? `Project Context: ${projectContext}` : ''}

Call Transcript:
${transcript}

Please provide your response in the following JSON format:
{
  "bulletPoints": [
    {
      "title": "Brief title",
      "description": "Detailed description",
      "category": "deliverable|requirement|assumption|timeline"
    }
  ],
  "summary": "Brief summary of the key points discussed"
}

Focus on actionable items that would be included in a professional SOW document. Be specific and avoid generic statements.
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
      } catch (parseError) {
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
    const currentModelIndex = models.indexOf(this.modelName);
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

Please analyze the following call transcript between LeanData and ${customerName} and provide:

1. **Objective** - A clear, concise overall objective for the project (2-3 sentences)
2. **Scope** - 5-7 specific scope items that detail what will be implemented

Call Transcript:
${transcript}

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.

Required JSON format:
{
  "objective": "A clear, professional objective statement that captures the main goal of the project",
  "scope": [
    "Specific scope item 1",
    "Specific scope item 2",
    "Specific scope item 3",
    "Specific scope item 4",
    "Specific scope item 5"
  ]
}

Guidelines:
- The objective should be business-focused and capture the main goal
- Scope items should be specific, actionable, and implementation-focused
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

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No content received from Gemini');
      }

      // Raw response received

      // Try to parse the JSON response
      try {
        // Clean the content - remove any markdown formatting or extra text
        let cleanedContent = content.trim();
        
        // Remove markdown code blocks if present
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to extract JSON if there's extra text
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedContent = jsonMatch[0];
        }
        
        // Content cleaned for parsing
        
        const parsed = JSON.parse(cleanedContent);
        
        if (!parsed.objective || !parsed.scope) {
          throw new Error('Missing required fields in parsed response');
        }
        
        return {
          objective: parsed.objective,
          scope: Array.isArray(parsed.scope) ? parsed.scope : ['Scope could not be generated']
        };
            } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Content that failed to parse:', content);
        
        // Try a second attempt with a simpler prompt
        try {
          // Attempting second request with simplified prompt
          const simplePrompt = `
Analyze this call transcript and return ONLY valid JSON:
{
  "objective": "brief project objective",
  "scope": ["item1", "item2", "item3", "item4", "item5"]
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
            if (parsed.objective && parsed.scope) {
              // Second attempt successful
              return {
                objective: parsed.objective,
                scope: Array.isArray(parsed.scope) ? parsed.scope : ['Scope could not be generated']
              };
            }
          }
        } catch (secondError) {
          console.error('Second attempt also failed:', secondError);
        }
        
        // Fallback to text extraction
        const lines: string[] = content.split('\n').filter((line: string) => line.trim().length > 0);
        
        // Look for objective in various formats
        let objective: string | undefined = lines.find((line: string) => 
          line.toLowerCase().includes('objective') || 
          line.toLowerCase().includes('goal') ||
          line.toLowerCase().includes('aim') ||
          line.toLowerCase().includes('purpose')
        );
        
        // If no objective found, try to extract from the first meaningful paragraph
        if (!objective) {
          objective = lines.find((line: string) => 
            line.length > 20 && 
            !line.startsWith('-') && 
            !line.startsWith('•') && 
            !line.startsWith('*') &&
            !/^\d+\./.test(line.trim())
          );
        }
        
        objective = objective || 'Project objective could not be generated due to formatting issues';
        
        // Extract scope items from various list formats
        const scopeItems: string[] = lines
          .filter((line: string) => 
            line.trim().startsWith('-') || 
            line.trim().startsWith('•') || 
            line.trim().startsWith('*') ||
            /^\d+\./.test(line.trim()) ||
            line.trim().startsWith('1.') ||
            line.trim().startsWith('2.') ||
            line.trim().startsWith('3.') ||
            line.trim().startsWith('4.') ||
            line.trim().startsWith('5.')
          )
          .map((line: string) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
          .filter((item: string) => item.length > 0);
        
        return {
          objective: objective.replace(/^.*?:\s*/, '').trim(),
          scope: scopeItems.length > 0 ? scopeItems : [
            'Implement lead routing and automation',
            'Set up account matching and deduplication',
            'Configure territory-based lead assignment',
            'Integrate with existing Salesforce workflows',
            'Provide training and documentation'
          ]
        };
      }
    } catch (error) {
      console.error('Error analyzing transcription:', error);
      
      // Provide more specific error information
      let errorMessage = 'Project objective could not be generated due to an error';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'Project objective could not be generated: API key not configured';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Project objective could not be generated: API quota exceeded';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Project objective could not be generated: Rate limit exceeded';
        } else if (error.message.includes('network')) {
          errorMessage = 'Project objective could not be generated: Network error';
        } else {
          errorMessage = `Project objective could not be generated: ${error.message}`;
        }
      }
      
      return {
        objective: errorMessage,
        scope: [
          'Implement lead routing and automation',
          'Set up account matching and deduplication',
          'Configure territory-based lead assignment',
          'Integrate with existing Salesforce workflows',
          'Provide training and documentation'
        ]
      };
    }
  }

  /**
   * Generate project objectives based on customer and project information
   */
  async generateObjectives(
    request: ObjectivesGenerationRequest
  ): Promise<ObjectivesGenerationResponse> {
    const { customerName, projectDescription, products } = request;
    
    const prompt = `
You are an expert at creating professional project objectives for Statement of Work (SOW) documents for LeanData implementations.

Based on the following information, generate a comprehensive project objective description and 5-7 specific key objectives for ${customerName}:

Customer: ${customerName}
Products/Services: ${products}
${projectDescription ? `Project Description: ${projectDescription}` : ''}

Please provide your response in the following JSON format:
{
  "description": "A comprehensive paragraph describing the overall project objective, similar to: '[Customer] seeks to implement LeanData as part of their initiative to automate and improve their go to market processes by leveraging LeanData's Orchestration and BookIt platforms.'",
  "objectives": [
    "Accurate Lead to Account matching",
    "Deduplication of Leads and Contacts", 
    "Automate Lead and Contact routing",
    "Ensure accurate assignment to correct seller by assigning leads based on account size and territory segmentation",
    "Reduce manual management and distribution by operations and sales leadership",
    "Improve data quality and consistency across Salesforce objects",
    "Streamline lead qualification and routing processes"
  ]
}

The description should be professional and business-focused, following the pattern shown above. The objectives should be specific, measurable, and aligned with typical LeanData implementation goals. Include objectives related to lead/contact management, automation, data quality, and operational efficiency.

Use these example objectives as a reference but adapt them to the specific customer and project context:
- Accurate Lead to Account matching
- Deduplication of Leads and Contacts
- Automate Lead and Contact routing
- Ensure accurate assignment to correct seller by assigning leads based on account size and territory segmentation
- Reduce manual management and distribution by operations and sales leadership
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
          description: parsed.description || 'Project objectives could not be generated',
          objectives: parsed.objectives || ['Objective could not be generated']
        };
      } catch (parseError) {
        // If JSON parsing fails, create a fallback response
        return {
          description: 'Project objectives could not be generated due to formatting issues',
          objectives: [
            'Improve lead management and routing processes',
            'Automate account matching and deduplication',
            'Enhance sales team efficiency through better lead distribution',
            'Reduce manual data entry and processing time',
            'Implement scalable lead routing based on territory and revenue'
          ]
        };
      }
    } catch (error) {
      console.error('Error generating objectives:', error);
      return {
        description: 'Project objectives could not be generated due to an error',
        objectives: [
          'Improve lead management and routing processes',
          'Automate account matching and deduplication',
          'Enhance sales team efficiency through better lead distribution',
          'Reduce manual data entry and processing time',
          'Implement scalable lead routing based on territory and revenue'
        ]
      };
    }
  }
}

export { GeminiClient, type GeminiBulletPoint, type GeminiGenerationResponse, type ObjectivesGenerationResponse, type TranscriptionAnalysisResponse };

// Helper function to generate objectives
export async function generateObjectives(request: ObjectivesGenerationRequest): Promise<ObjectivesGenerationResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }

  const client = new GeminiClient(apiKey);
  return await client.generateObjectives(request);
}

// Helper function to analyze transcription
export async function analyzeTranscription(transcript: string, customerName: string): Promise<TranscriptionAnalysisResponse> {
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

  // Debug API key format
      // API key validation completed
  
  // Check if API key looks like it's been masked
  if (config.api_key.includes('•') || config.api_key.includes('····')) {
    throw new Error('API key appears to be masked. Please enter the actual API key, not the masked version.');
  }

  // Use the primary API key with the saved model
  const client = new GeminiClient(config.api_key, config.model_name || 'gemini-1.5-flash');
  return await client.analyzeTranscriptionWithFallback(transcript, customerName);
} 