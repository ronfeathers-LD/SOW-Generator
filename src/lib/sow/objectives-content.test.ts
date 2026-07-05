import { describe, expect, it } from 'vitest';
import { aiGenerationPatch, manualEditPatch } from './objectives-content';

describe('manualEditPatch', () => {
  it('overview: sets the custom field and marks it edited', () => {
    const patch = manualEditPatch('overview', '<p>Overview text</p>');
    expect(patch.custom_objective_overview_content).toBe('<p>Overview text</p>');
    expect(patch.objective_overview_content_edited).toBe(true);
    expect(patch).not.toHaveProperty('ai_generated_objective_overview_content');
  });

  it('keyObjectives: sets the custom field and marks it edited', () => {
    const patch = manualEditPatch('keyObjectives', '<ul><li>KO</li></ul>');
    expect(patch.custom_key_objectives_content).toBe('<ul><li>KO</li></ul>');
    expect(patch.key_objectives_content_edited).toBe(true);
    expect(patch).not.toHaveProperty('ai_generated_key_objectives_content');
  });

  it('deliverables: sets the custom field and marks it edited', () => {
    const patch = manualEditPatch('deliverables', '<ul><li>D1</li><li>D2</li></ul>');
    expect(patch.custom_deliverables_content).toBe('<ul><li>D1</li><li>D2</li></ul>');
    expect(patch.deliverables_content_edited).toBe(true);
    expect(patch).not.toHaveProperty('ai_generated_deliverables_content');
  });
});

describe('aiGenerationPatch', () => {
  it('writes custom + ai fields, resets edited flags, and joins deliverables', () => {
    const patch = aiGenerationPatch({
      overview: 'O',
      keyObjectivesHtml: '<p>K</p>',
      deliverablesHtml: '<p>D</p>',
      keyObjectives: ['k1'],
      deliverables: ['d1', 'd2'],
    });
    expect(patch.custom_objective_overview_content).toBe('O');
    expect(patch.ai_generated_objective_overview_content).toBe('O');
    expect(patch.objective_overview_content_edited).toBe(false);

    expect(patch.custom_key_objectives_content).toBe('<p>K</p>');
    expect(patch.ai_generated_key_objectives_content).toBe('<p>K</p>');
    expect(patch.key_objectives_content_edited).toBe(false);

    expect(patch.custom_deliverables_content).toBe('<p>D</p>');
    expect(patch.ai_generated_deliverables_content).toBe('<p>D</p>');
    expect(patch.deliverables_content_edited).toBe(false);

    expect(patch.deliverables).toBe('d1\nd2');
  });

  it('handles single deliverable', () => {
    const patch = aiGenerationPatch({
      overview: 'Overview',
      keyObjectivesHtml: '<p>KOs</p>',
      deliverablesHtml: '<p>Deliverables</p>',
      keyObjectives: ['k1', 'k2'],
      deliverables: ['single deliverable'],
    });
    expect(patch.deliverables).toBe('single deliverable');
  });

  it('handles empty deliverables array', () => {
    const patch = aiGenerationPatch({
      overview: 'Overview',
      keyObjectivesHtml: '<p>KOs</p>',
      deliverablesHtml: '<p>Deliverables</p>',
      keyObjectives: ['k1'],
      deliverables: [],
    });
    expect(patch.deliverables).toBe('');
  });
});
