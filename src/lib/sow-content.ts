// import { supabase } from './supabase'; // Not currently used
import { SOWContentTemplate } from '@/types/sow';

export async function getContentTemplate(sectionName: string): Promise<SOWContentTemplate | null> {
  try {
    const response = await fetch('/api/sow-content-templates');
    if (!response.ok) {
      console.error('Error fetching content templates:', response.statusText);
      return null;
    }
    
    const templates = await response.json();
    const template = templates.find((t: SOWContentTemplate) => t.section_name === sectionName);
    
    return template || null;
  } catch (error) {
    console.error('Error in getContentTemplate:', error);
    return null;
  }
}

export async function getAllContentTemplates(): Promise<SOWContentTemplate[]> {
  try {
    const response = await fetch('/api/sow-content-templates');
    if (!response.ok) {
      console.error('Error fetching content templates:', response.statusText);
      return [];
    }
    
    const templates = await response.json();
    return templates || [];
  } catch (error) {
    console.error('Error in getAllContentTemplates:', error);
    return [];
  }
}



export function processContentTemplate(
  template: SOWContentTemplate,
  replacements: Record<string, string>
): string {
  let content = template.default_content;

  // Replace placeholders with actual values
  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  });

  return content;
}

export function processIntroContent(
  content: string,
  clientName: string
): string {
  // Replace the placeholder with a bold span for the client name
  return content.replace(/{clientName}/g, `<span class="font-bold">${clientName}</span>`);
}

export function processScopeContent(
  content: string,
  deliverables: string[]
): string {
  // Process deliverables - they should come as strings that can be formatted
  // Each deliverable might be a category with items, or individual items
  const deliverablesHtml = deliverables
    .map((deliverable) => {
      // Check if this is a category with items (contains newlines)
      if (deliverable.includes('\n')) {
        const lines = deliverable.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const category = lines[0]; // First line is the category
        const items = lines.slice(1); // Rest are items
        
        const itemsHtml = items
          .map(item => `<div class="ml-4 mb-2">${item}</div>`)
          .join('\n');
        
        return `<div class="mb-4">
          <div class="font-bold text-lg mb-2">${category}</div>
          ${itemsHtml}
        </div>`;
      } else {
        // Single item
        return `<div class="mb-4"><div>${deliverable}</div></div>`;
      }
    })
    .join('\n');

  return content.replace(/{deliverables}/g, deliverablesHtml);
} 