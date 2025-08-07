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
  private model: any;
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
    customerName: string,
    existingDescription?: string,
    existingObjectives?: string[],
    selectedProducts?: string[]
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
        
        const result = await this.analyzeTranscription(transcript, customerName, existingDescription, existingObjectives, selectedProducts);
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
    customerName: string,
    existingDescription?: string,
    existingObjectives?: string[],
    selectedProducts?: string[]
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

${existingDescription ? `Existing Project Description: ${existingDescription}` : ''}
${existingObjectives && existingObjectives.length > 0 ? `Existing Objectives: ${existingObjectives.join(', ')}` : ''}
${selectedProducts && selectedProducts.length > 0 ? `Selected Products: ${selectedProducts.join(', ')}` : ''}

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
- ${existingDescription || existingObjectives?.length ? 'Consider the existing content and enhance or refine it based on the new transcript information.' : ''}
- Use double quotes for all strings
- Do not include any text before or after the JSON
- Do not use markdown code blocks
- Ensure the JSON is valid and parseable
`;
      return this.executePrompt(fallbackPrompt, transcript, customerName, existingDescription, existingObjectives, selectedProducts);
    }

    // Use the prompt from the database, replacing placeholders
    let prompt = aiPrompt.prompt_content
      .replace(/\{customerName\}/g, customerName)
      .replace(/\{transcription\}/g, transcript);

    // Debug: Log the prompt being sent to AI (with truncated transcript for readability)
    const truncatedTranscript = transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript;
    const truncatedPrompt = prompt.replace(transcript, truncatedTranscript);
    console.log('AI Prompt being sent:', truncatedPrompt);

    // Add existing content context if available
    if (existingDescription || existingObjectives?.length || selectedProducts?.length) {
      const existingContext = `
Existing Project Description: ${existingDescription || 'None provided'}
Existing Objectives: ${existingObjectives?.length ? existingObjectives.join(', ') : 'None provided'}
Selected Products: ${selectedProducts?.length ? selectedProducts.join(', ') : 'None provided'}

Please consider the existing content and selected products above and enhance or refine it based on the new transcript information.`;
      
      // Insert the existing context before the transcription
      prompt = prompt.replace(/\{transcription\}/g, existingContext + '\n\nCall Transcript:\n{transcription}');
      prompt = prompt.replace(/\{transcription\}/g, transcript);
    }

    return this.executePrompt(prompt, transcript, customerName, existingDescription, existingObjectives, selectedProducts);
  }

  /**
   * Execute a prompt and parse the response
   */
  private async executePrompt(
    prompt: string,
    transcript: string,
    customerName: string,
    existingDescription?: string,
    existingObjectives?: string[],
    selectedProducts?: string[]
  ): Promise<TranscriptionAnalysisResponse> {

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      // Debug: Log the raw AI response (truncated for readability)
      const truncatedResponse = content.length > 200 ? content.substring(0, 200) + '...' : content;
      console.log('Raw AI Response:', truncatedResponse);

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
        
        // Additional cleaning for markdown content
        cleanedContent = cleanedContent
          .replace(/^---.*$/gm, '') // Remove markdown separators
          .replace(/^###\s*\*\*.*?\*\*:?\s*/gm, '') // Remove markdown headers with bold
          .replace(/^#+\s*\*\*.*?\*\*:?\s*/gm, '') // Remove any markdown headers with bold
          .replace(/^#+\s*.*?:?\s*/gm, '') // Remove other markdown headers
          .replace(/^\*\*.*?\*\*:?\s*/gm, '') // Remove bold text labels
          .replace(/^[-*]\s*/gm, '') // Remove list markers
          .trim();
        
        // Try to find JSON again after cleaning
        const finalJsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (finalJsonMatch) {
          cleanedContent = finalJsonMatch[0];
        }
        
        // Content cleaned for parsing
        
        const parsed = JSON.parse(cleanedContent);
        
        if (!parsed.objectiveOverview || !parsed.painPoints || !parsed.solutions) {
          throw new Error('Missing required fields in parsed response');
        }
        
        return {
          objectiveOverview: parsed.objectiveOverview,
          painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : ['Pain points could not be generated'],
          solutions: {
            "Lead Routing": Array.isArray(parsed.solutions["Lead Routing"]) ? parsed.solutions["Lead Routing"] : ['Lead routing solutions could not be generated'],
            "Account Matching": Array.isArray(parsed.solutions["Account Matching"]) ? parsed.solutions["Account Matching"] : ['Account matching solutions could not be generated'],
            "BookIt": Array.isArray(parsed.solutions["BookIt"]) ? parsed.solutions["BookIt"] : ['BookIt solutions could not be generated'],
            "Integrations": Array.isArray(parsed.solutions["Integrations"]) ? parsed.solutions["Integrations"] : ['Integrations solutions could not be generated']
          },
          isFallback: false
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
            if (parsed.objectiveOverview && parsed.painPoints && parsed.solutions) {
              // Second attempt successful
              return {
                objectiveOverview: parsed.objectiveOverview,
                painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : ['Pain points could not be generated'],
                solutions: {
                  "Lead Routing": Array.isArray(parsed.solutions["Lead Routing"]) ? parsed.solutions["Lead Routing"] : ['Lead routing solutions could not be generated'],
                  "Account Matching": Array.isArray(parsed.solutions["Account Matching"]) ? parsed.solutions["Account Matching"] : ['Account matching solutions could not be generated'],
                  "BookIt": Array.isArray(parsed.solutions["BookIt"]) ? parsed.solutions["BookIt"] : ['BookIt solutions could not be generated'],
                  "Integrations": Array.isArray(parsed.solutions["Integrations"]) ? parsed.solutions["Integrations"] : ['Integrations solutions could not be generated']
                },
                isFallback: false
              };
            }
          }
        } catch (secondError) {
          console.error('Second attempt also failed:', secondError);
        }
        
        // Fallback to text extraction
        // Clean markdown content for text extraction
        const cleanedContent = content
          .replace(/^---.*$/gm, '') // Remove markdown separators
          .trim();
        
        const lines: string[] = cleanedContent.split('\n').filter((line: string) => line.trim().length > 0);
        
        // Look for objective section
        let objectiveSection = '';
        let scopeSection = '';
        let currentSection = '';
        
        for (const line of lines) {
          if (line.match(/^#+\s*\*\*.*OBJECTIVE.*\*\*/i) || line.match(/^#+\s*OBJECTIVE/i)) {
            currentSection = 'objective';
            continue;
          } else if (line.match(/^#+\s*\*\*.*SCOPE.*\*\*/i) || line.match(/^#+\s*SCOPE/i)) {
            currentSection = 'scope';
            continue;
          }
          
          if (currentSection === 'objective' && !line.match(/^#+\s*/)) {
            objectiveSection += line + '\n';
          } else if (currentSection === 'scope' && !line.match(/^#+\s*/)) {
            scopeSection += line + '\n';
          }
        }
        
        // Use parsed sections if available, otherwise fall back to line-by-line search
        let objective: string = '';
        if (objectiveSection.trim()) {
          objective = objectiveSection.trim();
        } else {
          // Look for objective in various formats
          const objectiveLine = lines.find((line: string) => 
            line.toLowerCase().includes('objective') || 
            line.toLowerCase().includes('goal') ||
            line.toLowerCase().includes('aim') ||
            line.toLowerCase().includes('purpose')
          );
          
          // If no objective found, try to extract from the first meaningful paragraph
          if (objectiveLine) {
            objective = objectiveLine;
          } else {
            objective = lines.find((line: string) => 
              line.length > 20 && 
              !line.startsWith('-') && 
              !line.startsWith('•') && 
              !line.startsWith('*') &&
              !/^\d+\./.test(line.trim())
            ) || 'Project objective could not be generated due to formatting issues';
          }
        }
        
        // Extract scope items from parsed section or various list formats
        let scopeItems: string[] = [];
        if (scopeSection.trim()) {
          // Parse scope section for list items
          const scopeLines = scopeSection.split('\n').filter(line => line.trim().length > 0);
          scopeItems = scopeLines
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
        }
        
        // If no scope items found in parsed section, fall back to line-by-line search
        if (scopeItems.length === 0) {
          scopeItems = lines
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
        }
        
        return {
          objectiveOverview: objective.replace(/^.*?:\s*/, '').trim(),
          painPoints: scopeItems.length > 0 ? scopeItems.slice(0, 3) : ['Manual lead routing and assignment processes', 'Duplicate leads and contacts in Salesforce', 'Inconsistent data quality across objects'],
          solutions: {
            "Lead Routing": scopeItems.length > 3 ? scopeItems.slice(3, 5) : ['Automate lead routing based on territory and account status'],
            "Account Matching": scopeItems.length > 5 ? scopeItems.slice(5, 7) : ['Implement lead-to-account matching logic'],
            "BookIt": scopeItems.length > 7 ? scopeItems.slice(7, 9) : ['Streamline meeting scheduling and calendar management'],
            "Integrations": scopeItems.length > 9 ? scopeItems.slice(9, 11) : ['Integrate with existing marketing automation and CRM systems']
          },
          isFallback: true
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
        objectiveOverview: errorMessage,
        painPoints: ['Manual lead routing and assignment processes', 'Duplicate leads and contacts in Salesforce', 'Inconsistent data quality across objects'],
        solutions: {
          "Lead Routing": ['Automate lead routing based on territory and account status'],
          "Account Matching": ['Implement lead-to-account matching logic'],
          "BookIt": ['Streamline meeting scheduling and calendar management'],
          "Integrations": ['Integrate with existing marketing automation and CRM systems']
        },
        isFallback: true
      };
    }
  }

}

export { GeminiClient, type GeminiBulletPoint, type GeminiGenerationResponse, type TranscriptionAnalysisResponse };

// Helper function to analyze transcription
export async function analyzeTranscription(
  transcript: string, 
  customerName: string, 
  existingDescription?: string, 
  existingObjectives?: string[],
  selectedProducts?: string[]
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

  // Debug API key format
      // API key validation completed
  
  // Check if API key looks like it's been masked
  if (config.api_key.includes('•') || config.api_key.includes('····')) {
    throw new Error('API key appears to be masked. Please enter the actual API key, not the masked version.');
  }

  // Use the primary API key with the saved model
  const client = new GeminiClient(config.api_key, config.model_name || 'gemini-2.5-flash');
  return await client.analyzeTranscriptionWithFallback(transcript, customerName, existingDescription, existingObjectives, selectedProducts);
} 