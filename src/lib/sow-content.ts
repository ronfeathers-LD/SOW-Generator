import { supabase } from './supabase';
import { SOWContentTemplate } from '@/types/sow';

export async function getContentTemplate(sectionName: string): Promise<SOWContentTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('sow_content_templates')
      .select('*')
      .eq('section_name', sectionName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching content template:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getContentTemplate:', error);
    return null;
  }
}

export async function getAllContentTemplates(): Promise<SOWContentTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('sow_content_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching content templates:', error);
      return [];
    }

    return data || [];
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
  const deliverablesHtml = deliverables
    .map((deliverable, index) => `<div class="mb-4"><div>${deliverable}</div></div>`)
    .join('\n');

  return content.replace(/{deliverables}/g, deliverablesHtml);
} 