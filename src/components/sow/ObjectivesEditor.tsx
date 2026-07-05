import React from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import TipTapEditor from '../TipTapEditor';
import { manualEditPatch } from '@/lib/sow/objectives-content';

interface ObjectivesEditorProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount?: SalesforceAccount | null;
  selectedOpportunity?: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null;
  /**
   * Task 4's "Generate with AI" panel. Rendered in a stable slot at the top
   * of the editor, wrapped in a `#ai-generation-panel` anchor div so Task 4
   * can target it without another edit to this file. Left undefined for now
   * (renders nothing) — SOWForm doesn't pass it yet.
   */
  aiPanel?: React.ReactNode;
}

const PLACEHOLDER = 'Write objectives here, or use Generate with AI above.';

// Pre-wizard SOWs stored key objectives as a string[] and deliverables as a
// single string, with no HTML content fields at all. FinalEditStep fell back
// to rendering those as HTML when custom_*_content was empty; reproduced here
// so old SOWs still show their content instead of a blank editor.
function keyObjectivesFallbackHtml(items: string[]): string {
  return `<ul class="list-disc pl-6 mb-4">${items.map((item) => `<li class="mb-1">${item}</li>`).join('')}</ul>`;
}

export default function ObjectivesEditor({
  formData,
  setFormData,
  aiPanel,
}: ObjectivesEditorProps) {
  const overviewValue =
    formData.custom_objective_overview_content || formData.objectives?.description || '';

  const keyObjectivesValue =
    formData.custom_key_objectives_content ||
    (formData.objectives?.key_objectives?.length
      ? keyObjectivesFallbackHtml(formData.objectives.key_objectives)
      : '');

  const deliverablesValue =
    formData.custom_deliverables_content ||
    (formData.deliverables ? `<p>${formData.deliverables}</p>` : '');

  const handleOverviewChange = (html: string) => {
    setFormData({
      ...formData,
      ...manualEditPatch('overview', html),
      // Legacy mirror: pre-custom-content SOWs and any other reader of
      // objectives.description stay in sync with manual edits.
      objectives: {
        ...(formData.objectives || { description: '', key_objectives: [] }),
        description: html,
      },
    });
  };

  const handleKeyObjectivesChange = (html: string) => {
    // FinalEditStep never derived objectives.key_objectives (the legacy
    // string[] mirror) from the edited HTML — it only re-persisted whatever
    // array was already there. There's no HTML->array conversion to redo
    // here, so manual edits only touch the custom content field.
    setFormData({
      ...formData,
      ...manualEditPatch('keyObjectives', html),
    });
  };

  const handleDeliverablesChange = (html: string) => {
    // Same story as key objectives: the legacy `deliverables` string field
    // was only ever re-serialized unchanged by FinalEditStep, never derived
    // from the edited HTML.
    setFormData({
      ...formData,
      ...manualEditPatch('deliverables', html),
    });
  };

  return (
    <div className="space-y-6">
      <div id="ai-generation-panel">{aiPanel}</div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">Objective Overview</h3>
        <TipTapEditor
          value={overviewValue}
          onChange={handleOverviewChange}
          placeholder={PLACEHOLDER}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted">
          A high-level overview of what the project will entail.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">Key Objectives</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-dark-text-muted">
          Pain points that the customer has outlined for us to solve. Use the toolbar to format with
          bullet points, numbered lists, and emphasis.
        </p>
        <TipTapEditor
          value={keyObjectivesValue}
          onChange={handleKeyObjectivesChange}
          placeholder={PLACEHOLDER}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted">
          Pain points that the customer has outlined for us to solve.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">Deliverables</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-dark-text-muted">
          Solutions to the pain points, utilizing LeanData products. Organize by product/category
          (LEANDATA ROUTING, LEANDATA BOOKIT, INTEGRATIONS, etc.).
        </p>
        <TipTapEditor
          value={deliverablesValue}
          onChange={handleDeliverablesChange}
          placeholder={PLACEHOLDER}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted">
          Solutions to the pain points, utilizing LeanData products.
        </p>
      </div>
    </div>
  );
}
