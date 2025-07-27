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

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

export { GeminiClient, type GeminiBulletPoint, type GeminiGenerationResponse, type ObjectivesGenerationResponse };

// Helper function to generate objectives
export async function generateObjectives(request: ObjectivesGenerationRequest): Promise<ObjectivesGenerationResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }

  const client = new GeminiClient(apiKey);
  return await client.generateObjectives(request);
} 