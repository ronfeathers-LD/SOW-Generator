'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PreSubmitChecklistModal from '@/components/sow/PreSubmitChecklistModal';
import { getFixLinkForMessage } from '@/lib/sow/fix-links';
import { DisplaySOW } from '@/types/sow-display';
import { Button } from '@/components/ui/form';

/**
 * Draft-status submit control for the SOW view: validates the SOW client-side,
 * surfaces missing fields / errors with deep links to the owning edit section,
 * and — on a clean pass — runs the pre-submission checklist before flipping the
 * SOW to `in_review`.
 *
 * Extracted verbatim from `SOWDisplay` (#68 slice 3). Behavior-preserving.
 */
export default function ValidationSubmitButton({ sow }: { sow: DisplaySOW }) {
  const [validation, setValidation] = useState<{
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const checkValidation = useCallback(async () => {
    try {
      // Use the client-safe validation utility
      const { validateSOWForApproval } = await import('@/lib/validation-utils');
      const validationResult = validateSOWForApproval(sow as unknown as Record<string, unknown>);

      setValidation(validationResult);
      return validationResult.isValid;
    } catch (error) {
      console.error('❌ Error checking validation:', error);
      return false;
    }
  }, [sow]);

  const handleSubmitForReview = async () => {
    try {
      // Check validation before allowing submission
      const isValid = await checkValidation();
      if (!isValid) {
        alert('Cannot submit for review: SOW validation failed. Please complete all required fields first.');
        return;
      }

      // Validation passed — show the pre-submission checklist
      setShowChecklist(true);
    } catch (error) {
      console.error('Error validating for review:', error);
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      setShowChecklist(false);
      setSubmitting(true);

      // Simply update the SOW status to 'in_review'
      const response = await fetch(`/api/sow/${sow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_review',
          updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Show success message
        alert('SOW submitted for review successfully!');
        // Refresh the page to show the updated status
        window.location.reload();
      } else {
        const error = await response.text();
        alert(`Failed to submit for review: ${error}`);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  // Check validation when component mounts
  useEffect(() => {
    checkValidation();
  }, [sow.id, checkValidation]);

  return (
    <div>
      <Button
        variant="brand"
        onClick={handleSubmitForReview}
        disabled={submitting || (validation?.isValid === false)}
        title={
          validation?.isValid === false
            ? `Cannot submit: ${validation.missingFields.length} missing fields, ${validation.errors.length} validation errors`
            : 'Click to submit SOW for review'
        }
      >
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </Button>

      {/* Show validation errors if button is disabled */}
      {validation?.isValid === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <p className="text-red-800 font-medium mb-2">❌ Cannot Submit for Review:</p>

          {validation.missingFields.length > 0 && (
            <div className="mb-2">
              <p className="text-red-700 font-medium">Missing Required Fields:</p>
              <ul className="text-red-600 ml-4 list-disc">
                {validation.missingFields.map((field, index) => {
                  const link = getFixLinkForMessage(field, sow.id);
                  return (
                    <li key={index}>
                      {field}
                      {link && (
                        <>
                          {' '}
                          <Link href={link.href} className="text-blue-600 hover:underline">
                            {link.text}
                          </Link>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="mb-2">
              <p className="text-red-700 font-medium">Validation Errors:</p>
              <ul className="text-red-600 ml-4 list-disc">
                {validation.errors.map((error, index) => {
                  const link = getFixLinkForMessage(error, sow.id);
                  return (
                    <li key={index}>
                      {error}
                      {link && (
                        <>
                          {' '}
                          <Link href={link.href} className="text-blue-600 hover:underline">
                            {link.text}
                          </Link>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="text-red-600 text-xs">
            Complete all required fields above to enable submission for review.
          </p>
        </div>
      )}

      <PreSubmitChecklistModal
        isOpen={showChecklist}
        onClose={() => setShowChecklist(false)}
        onConfirm={handleConfirmSubmit}
        sow={sow}
      />
    </div>
  );
}
