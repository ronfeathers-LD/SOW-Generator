-- Fix missing columns and add default data

-- Add missing redirect_uri column to google_drive_configs
ALTER TABLE google_drive_configs ADD COLUMN IF NOT EXISTS redirect_uri TEXT;

-- Insert default AI prompts
INSERT INTO ai_prompts (name, description, prompt_content, is_active, sort_order) VALUES
(
  'Transcription Analysis',
  'Default prompt for analyzing Avoma call transcriptions',
  'You are an expert at analyzing sales call transcriptions and extracting key information for Statement of Work (SOW) documents. 

Please analyze the following call transcription and extract:

1. **Client Information:**
   - Company name and industry
   - Key stakeholders mentioned
   - Contact information if available

2. **Project Scope:**
   - Main objectives and goals
   - Specific deliverables mentioned
   - Timeline expectations
   - Budget considerations

3. **Technical Requirements:**
   - Technology stack preferences
   - Integration requirements
   - Performance expectations
   - Security requirements

4. **Business Context:**
   - Pain points and challenges
   - Success criteria
   - Risk factors mentioned
   - Assumptions made

5. **Next Steps:**
   - Action items identified
   - Follow-up requirements
   - Decision points

Please format your response in a clear, structured manner that can be easily incorporated into a professional SOW document. Focus on factual information from the call and avoid speculation.

Transcription to analyze:
{transcription}',
  true,
  1
),
(
  'SOW Content Generation',
  'Default prompt for generating SOW content sections',
  'You are an expert at creating professional Statement of Work (SOW) documents. 

Based on the provided context and requirements, please generate content for the following SOW section: {section_name}

Context:
- Client: {client_name}
- Project: {project_description}
- Requirements: {requirements}

Please create content that is:
- Professional and clear
- Specific to the client and project
- Comprehensive but concise
- Suitable for a formal business document

Focus on the {section_name} section and ensure it aligns with the overall project scope and objectives.',
  true,
  2
)
ON CONFLICT (name) DO NOTHING;
