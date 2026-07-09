/**
 * Pure content fan-out functions for objectives editing.
 *
 * These functions build form patches for manual editing and AI generation.
 * They are stateless record-builders — the caller is responsible for composing
 * legacy fields that require previous state (e.g., objectives.description,
 * objectives.key_objectives).
 */

export interface GeneratedObjectives {
  overview: string;
  keyObjectivesHtml: string;
  deliverablesHtml: string;
  keyObjectives: string[];
  deliverables: string[];
  scopeHtml: string;
}

/**
 * Build a form patch for a manual editor change to one objectives field.
 *
 * Sets the matching `custom_*_content` to `html`, sets the matching `*_edited`
 * flag to `true`, and does NOT touch `ai_generated_*` fields.
 *
 * Legacy mirrors (objectives.description, objectives.key_objectives) are
 * composed by the caller since they require previous state.
 *
 * @param field - The field being edited: 'overview', 'keyObjectives', or 'deliverables'
 * @param html - The edited HTML content
 * @returns Form data patch with custom content and edited flag
 */
export function manualEditPatch(
  field: 'overview' | 'keyObjectives' | 'deliverables',
  html: string
): Record<string, unknown> {
  switch (field) {
    case 'overview':
      return {
        custom_objective_overview_content: html,
        objective_overview_content_edited: true,
      };
    case 'keyObjectives':
      return {
        custom_key_objectives_content: html,
        key_objectives_content_edited: true,
      };
    case 'deliverables':
      return {
        custom_deliverables_content: html,
        deliverables_content_edited: true,
      };
  }
}

/**
 * Build a form patch for an AI generation result.
 *
 * Sets all three custom and ai_generated fields, resets all three edited flags
 * to false, and joins the deliverables array with newlines.
 *
 * Legacy mirrors (objectives.description, objectives.key_objectives) are
 * composed by the caller since they require previous state.
 *
 * @param gen - The generated objectives from AI
 * @returns Form data patch with custom, ai_generated, edited flags, and deliverables
 */
export function aiGenerationPatch(gen: GeneratedObjectives): Record<string, unknown> {
  return {
    // Overview
    custom_objective_overview_content: gen.overview,
    ai_generated_objective_overview_content: gen.overview,
    objective_overview_content_edited: false,

    // Key Objectives
    custom_key_objectives_content: gen.keyObjectivesHtml,
    ai_generated_key_objectives_content: gen.keyObjectivesHtml,
    key_objectives_content_edited: false,

    // Deliverables
    custom_deliverables_content: gen.deliverablesHtml,
    ai_generated_deliverables_content: gen.deliverablesHtml,
    deliverables_content_edited: false,

    // Scope (SVF pillar-organized, generated alongside deliverables)
    custom_scope_content: gen.scopeHtml,
    ai_generated_scope_content: gen.scopeHtml,
    scope_content_edited: false,

    // Legacy deliverables array
    deliverables: gen.deliverables.join('\n'),
  };
}
