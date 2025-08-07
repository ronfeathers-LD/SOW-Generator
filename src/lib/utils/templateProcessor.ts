import { getContentTemplate, processIntroContent, processScopeContent } from '@/lib/sow-content';

interface TemplateConfig {
  name: string;
  processor: (content: string, data: unknown) => string;
  required?: boolean;
}

interface ProcessTemplatesOptions {
  data: unknown;
  templates: TemplateConfig[];
}

export const processTemplates = async ({ data, templates }: ProcessTemplatesOptions): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  
  await Promise.all(
    templates.map(async (config) => {
      try {
        const template = await getContentTemplate(config.name);
        if (template) {
          results[config.name] = config.processor(template.default_content, data);
        } else if (config.required) {
          console.warn(`Required template ${config.name} not found`);
          results[config.name] = '';
        }
      } catch (error) {
        console.warn(`Failed to load ${config.name} template:`, error);
        results[config.name] = '';
      }
    })
  );

  return results;
};

// Predefined template configurations for SOW creation
export const SOW_TEMPLATES: TemplateConfig[] = [
  {
    name: 'intro',
    processor: (content: string, data: unknown) => {
      const typedData = data as { header?: { client_name?: string }; template?: { customer_name?: string } };
      const clientName = typedData.header?.client_name || typedData.template?.customer_name || '';
      return clientName ? processIntroContent(content, clientName) : content;
    }
  },
  {
    name: 'scope',
    processor: (content: string, data: unknown) => {
      const typedData = data as { scope?: { deliverables?: string } };
      const deliverables = typedData.scope?.deliverables ? typedData.scope.deliverables.split('\n').filter(Boolean) : [];
      return processScopeContent(content, deliverables);
    }
  },
  {
    name: 'objectives-disclosure',
    processor: (content: string) => content // No processing needed
  },
  {
    name: 'assumptions',
    processor: (content: string) => content // No processing needed
  },
  {
    name: 'project-phases',
    processor: (content: string) => content // No processing needed
  },
  {
    name: 'roles',
    processor: (content: string) => content // No processing needed
  }
];

// Helper function for SOW creation
export const processSOWTemplates = async (data: unknown): Promise<Record<string, string>> => {
  return processTemplates({ data, templates: SOW_TEMPLATES });
};
