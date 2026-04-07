'use client';

import { useState, useMemo } from 'react';
import {
  runAutomatedChecks,
  getVisibleManualItems,
  ChecklistSOWData,
  CheckResult,
  ChecklistItem,
} from '@/lib/pre-submit-checks';

interface PreSubmitChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sow: ChecklistSOWData;
}

export default function PreSubmitChecklistModal({
  isOpen,
  onClose,
  onConfirm,
  sow,
}: PreSubmitChecklistModalProps) {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  const automatedResults = useMemo(() => runAutomatedChecks(sow), [sow]);
  const visibleManualItems = useMemo(() => getVisibleManualItems(sow), [sow]);

  const warningCount = automatedResults.filter((r) => !r.result.passed).length;

  const allManualChecked = useMemo(
    () => visibleManualItems.every((item) => manualChecks[item.id]),
    [visibleManualItems, manualChecks]
  );

  const toggleManual = (id: string) => {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Pre-Submission Checklist
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Review these items before submitting. Warnings won&apos;t block you, but all
          confirmations must be checked.
        </p>

        {/* Automated Checks Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Automated Checks
            {warningCount > 0 && (
              <span className="ml-2 text-amber-600 normal-case font-normal">
                ({warningCount} {warningCount === 1 ? 'warning' : 'warnings'})
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {automatedResults.map(({ item, result }) => (
              <AutomatedCheckRow
                key={item.id}
                item={item}
                result={result}
              />
            ))}
          </div>
        </div>

        {/* Manual Acknowledgments Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Please Confirm
          </h3>
          <div className="space-y-2">
            {visibleManualItems.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!manualChecks[item.id]}
                  onChange={() => toggleManual(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!allManualChecked}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              allManualChecked
                ? 'text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={
              allManualChecked
                ? {
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #26D07C',
                  }
                : undefined
            }
          >
            Confirm &amp; Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomatedCheckRow({
  item,
  result,
}: {
  item: ChecklistItem;
  result: CheckResult;
}) {
  if (result.passed) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
        <svg
          className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm text-green-800">{item.label}</span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div>
          <span className="text-sm font-medium text-amber-800">
            {item.label}
          </span>
          {result.detail && (
            <p className="text-xs text-amber-700 mt-1">{result.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
