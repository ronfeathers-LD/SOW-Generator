import { describe, it, expect, vi } from 'vitest';
import { createContentHandler } from './contentHandlers';

// Mirrors ContentEditingTab's normalizeContent: strip HTML tags, collapse
// whitespace, so comparisons ignore incidental markup/whitespace differences.
function normalizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const scopeConfig = {
  sectionName: 'scope',
  templateKey: 'originalScopeTemplate',
  contentKey: 'custom_scope_content' as const,
  editedKey: 'scope_content_edited' as const,
  aiBaselineKey: 'ai_generated_scope_content' as const,
};

function makeContext(formData: Record<string, unknown>) {
  const setFormData = vi.fn();
  const context = {
    initializing: false,
    initializedSections: new Set(['scope']),
    templates: { originalScopeTemplate: '<p>Default scope template</p>' },
    formData,
    setFormData,
    normalizeContent,
  };
  return { context, setFormData };
}

describe('createContentHandler — aiBaselineKey (#422)', () => {
  it('content matching the AI baseline (but not the template) is not flagged as edited', () => {
    const { context, setFormData } = makeContext({
      ai_generated_scope_content: '<p>AI baseline scope</p>',
    });
    const handler = createContentHandler(scopeConfig, context);

    handler('<p>AI baseline scope</p>');

    expect(setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_scope_content: '<p>AI baseline scope</p>',
        scope_content_edited: false,
      })
    );
  });

  it('content differing from the AI baseline is flagged as edited', () => {
    const { context, setFormData } = makeContext({
      ai_generated_scope_content: '<p>AI baseline scope</p>',
    });
    const handler = createContentHandler(scopeConfig, context);

    handler('<p>Something the user typed instead</p>');

    expect(setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_scope_content: '<p>Something the user typed instead</p>',
        scope_content_edited: true,
      })
    );
  });

  it('falls back to the template when the AI baseline is empty/absent', () => {
    const { context, setFormData } = makeContext({
      ai_generated_scope_content: '',
    });
    const handler = createContentHandler(scopeConfig, context);

    handler('<p>Default scope template</p>');

    expect(setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_scope_content: '<p>Default scope template</p>',
        scope_content_edited: false,
      })
    );
  });
});
