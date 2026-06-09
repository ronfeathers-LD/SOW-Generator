'use client';

import React, { useMemo, useState } from 'react';
import { SOWData } from '@/types/sow';
import { reviewSOW, buildChecklistInput } from '@/lib/sow/review';
import { SowTabKey } from '@/lib/sow/tab-payloads';
import { Alert, Button, Card, SectionHeader } from '@/components/ui/form';
import PreSubmitChecklistModal from '@/components/sow/PreSubmitChecklistModal';

interface ReviewSubmitTabProps {
  formData: Partial<SOWData>;
  sowId?: string;
  /** Current SOW status — submission is only offered for drafts. */
  status?: string;
  /** Unsaved edits must be persisted before the SOW can be submitted. */
  hasUnsavedChanges: boolean;
  /** Jump the wizard to a section (so the user can fix an issue in place). */
  onGoToSection: (tab: SowTabKey) => void;
}

/**
 * Final wizard step: aggregates the strict submit-gating validation
 * (validateSOWForApproval, via reviewSOW) across every section, tells the user
 * exactly what's missing and where to fix it, and — once clean and saved —
 * submits the SOW for review in place via the pre-submission checklist. This is
 * where the wizard ends: no round-trip to the view page to actually submit.
 */
export default function ReviewSubmitTab({
  formData,
  sowId,
  status,
  hasUnsavedChanges,
  onGoToSection,
}: ReviewSubmitTabProps) {
  const { result, bySection } = useMemo(() => reviewSOW(formData), [formData]);
  const checklistSow = useMemo(() => buildChecklistInput(formData), [formData]);
  const issueCount = result.missingFields.length + result.errors.length;

  const [showChecklist, setShowChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Brand-new SOWs come through the wizard as drafts; only drafts can be
  // submitted for review from here. Anything already in review/approved is
  // surfaced as a status notice with a link to its view page instead.
  const isDraft = !status || status === 'draft';
  const canSubmit = !!sowId && isDraft && result.isValid && !hasUnsavedChanges && !submitting;

  const handleConfirmSubmit = async () => {
    if (!sowId) return;
    try {
      setShowChecklist(false);
      setSubmitting(true);
      setSubmitError(null);

      const response = await fetch(`/api/sow/${sowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_review',
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // The wizard's job is done — hand off to the view page, which shows the
        // in-review status and the approval workflow.
        window.location.href = `/sow/${sowId}`;
      } else {
        const error = await response.text();
        setSubmitError(`Failed to submit for review: ${error}`);
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      setSubmitError('Failed to submit for review. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Card padding="md" className="space-y-6">
      <SectionHeader
        title="Review & Submit"
        description="A final check across every section before this SOW goes for review."
      />

      {!isDraft ? (
        <Alert tone="info">
          <p className="font-medium">This SOW has already been submitted.</p>
          <p>
            Its current status is <span className="font-medium">{status}</span>. Track its review
            progress on the SOW page.
          </p>
        </Alert>
      ) : result.isValid ? (
        <Alert tone="success">
          <p className="font-medium">All required fields are complete.</p>
          <p>This SOW is ready to be submitted for review.</p>
        </Alert>
      ) : (
        <Alert tone="warning">
          <p className="font-medium">
            {issueCount} item{issueCount === 1 ? '' : 's'} need attention before this SOW can be submitted.
          </p>
          <p>Fix the items below — use “Go to section” to jump straight to each one.</p>
        </Alert>
      )}

      {isDraft && bySection.length > 0 && (
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

      {submitError && <Alert tone="error">{submitError}</Alert>}

      {/* When valid but with unsaved edits, the user must save first so the
          submitted SOW matches what was just validated. */}
      {isDraft && result.isValid && hasUnsavedChanges && (
        <Alert tone="info">Save your changes before submitting for review.</Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
        {isDraft ? (
          // Save lives in the wizard footer; this step only owns the submit action.
          <Button
            variant="brand"
            onClick={() => setShowChecklist(true)}
            disabled={!canSubmit}
            loading={submitting}
            title={
              !result.isValid
                ? 'Complete all required fields before submitting'
                : hasUnsavedChanges
                  ? 'Save your changes before submitting'
                  : 'Submit this SOW for review'
            }
          >
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
        ) : (
          sowId && (
            <a
              href={`/sow/${sowId}`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26D07C]"
            >
              View SOW
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )
        )}
      </div>

      <PreSubmitChecklistModal
        isOpen={showChecklist}
        onClose={() => setShowChecklist(false)}
        onConfirm={handleConfirmSubmit}
        sow={checklistSow}
      />
    </Card>
  );
}
