/**
 * Shared prop-shape types for the surviving Objectives source-selection
 * steps (`DocumentSelectionStep`, `AvomaSelectionStep`, `AIGenerationModal`)
 * and their host, `AiGenerationPanel`. Originally defined in
 * `ObjectivesWizard.tsx`; extracted here when the wizard chrome was deleted
 * (Task 6) so these still-used components have a home for the types that
 * doesn't require the deleted wizard file.
 */

/**
 * Nav intent a sub-step can publish to a footer. Retained only because
 * `DocumentSelectionStep`/`AvomaSelectionStep` still accept a `setNav` prop;
 * `AiGenerationPanel` passes a no-op since it has no wizard footer to drive.
 */
export interface ObjectivesStepNav {
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
}

export interface WizardStepData {
  selectedDocuments: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string;
    wasTruncated?: boolean;
  }>;
  selectedMeetings: Array<{
    id: string;
    url: string;
    transcription?: string;
    title?: string;
    date?: string;
    status: 'pending' | 'completed' | 'failed';
  }>;
  previewContent: string;
  generatedObjectives: {
    overview: string;
    keyObjectives: string[];
    deliverables: string[];
    keyObjectivesHtml?: string;
    deliverablesHtml?: string;
  };
}
