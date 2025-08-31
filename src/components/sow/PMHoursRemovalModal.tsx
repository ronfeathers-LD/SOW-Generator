'use client';

import { useState } from 'react';

interface PMHoursRequirementDisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sowId: string;
  currentPMHours: number;
  onRequestSubmitted: () => void;
}

export default function PMHoursRequirementDisableModal({
  isOpen,
  onClose,
  sowId,
  currentPMHours,
  onRequestSubmitted
}: PMHoursRequirementDisableModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for removing PM hours');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/pm-hours-removal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sowId,
          currentPMHours,
          reason: reason.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onRequestSubmitted();
        onClose();
        // Reset form
        setReason('');
      } else {
        setError(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting PM hours removal request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Disable PM Hours Requirement
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current PM Hours Display */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Current PM Hours</p>
            <p className="text-lg font-semibold text-gray-900">{currentPMHours} hours</p>
          </div>

                    {/* Current PM Hours Display */}
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-600">Current PM Hours</p>
            <p className="text-lg font-semibold text-red-900">{currentPMHours} hours</p>
            <p className="text-xs text-red-600">
              Financial Impact: ${(currentPMHours * 250).toLocaleString()}
            </p>
            <p className="text-xs text-red-600 mt-1">
              This request will disable the PM hours requirement entirely for this SOW
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Removal <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please explain why you need to remove these PM hours..."
              required
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Request PM Hours Disable'}
            </button>
          </div>
        </form>

        {/* Information Box */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">What this request does:</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Disables the automatic PM hours requirement for this SOW</li>
            <li>• Future calculations will not include Project Manager hours</li>
            <li>• Existing PM hours will be removed and redistributed to Onboarding Specialist</li>
            <li>• Your request will be reviewed by a PM Director</li>
            <li>• You can discuss the request with the PM Director through comments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
