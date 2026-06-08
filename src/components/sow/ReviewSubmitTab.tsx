import React, { useMemo } from 'react';
import { SOWData } from '@/types/sow';
import { reviewSOW } from '@/lib/sow/review';
import { SowTabKey } from '@/lib/sow/tab-payloads';
import { Alert, Button, Card, SectionHeader } from '@/components/ui/form';

interface ReviewSubmitTabProps {
  formData: Partial<SOWData>;
  sowId?: string;
  /** Jump the wizard to a section (so the user can fix an issue in place). */
  onGoToSection: (tab: SowTabKey) => void;
  /** Persist all sections (save-all). */
  onSaveAll: () => void;
  isSaving: boolean;
}

/**
 * Final wizard step: aggregates the strict submit-gating validation
 * (validateSOWForApproval) across every section and tells the user exactly
 * what's missing and where to fix it. Submission itself stays on the SOW view
 * page; this step gets the SOW ready and routes the user there when it's valid.
 */
export default function ReviewSubmitTab({
  formData,
  sowId,
  onGoToSection,
  onSaveAll,
  isSaving,
}: ReviewSubmitTabProps) {
  const { result, bySection } = useMemo(() => reviewSOW(formData), [formData]);
  const issueCount = result.missingFields.length + result.errors.length;

  return (
    <Card padding="md" className="space-y-6">
      <SectionHeader
        title="Review & Submit"
        description="A final check across every section before this SOW goes for review."
      />

      {result.isValid ? (
        <Alert tone="success">
          <p className="font-medium">All required fields are complete.</p>
          <p>This SOW is ready to be submitted for review from its view page.</p>
        </Alert>
      ) : (
        <Alert tone="warning">
          <p className="font-medium">
            {issueCount} item{issueCount === 1 ? '' : 's'} need attention before this SOW can be submitted.
          </p>
          <p>Fix the items below — use “Go to section” to jump straight to each one.</p>
        </Alert>
      )}

      {bySection.length > 0 && (
        <div className="space-y-4">
          {bySection.map(({ tab, issues }) => (
            <Card key={tab} tone="muted" padding="sm" className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-900">{tab}</h3>
                <Button variant="secondary" size="sm" onClick={() => onGoToSection(tab)}>
                  Go to section
                </Button>
              </div>
              <ul className="ml-4 list-disc space-y-1 text-sm text-gray-700">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
        <Button variant="primary" onClick={onSaveAll} loading={isSaving}>
          Save all changes
        </Button>
        {sowId && (
          <a
            href={`/sow/${sowId}`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26D07C]"
          >
            View SOW
            {result.isValid && ' & submit for review'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </Card>
  );
}
