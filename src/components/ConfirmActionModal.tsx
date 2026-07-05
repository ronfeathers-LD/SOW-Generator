'use client';

import { useEffect, useState } from 'react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** When set, the user must type this exact text to enable the confirm button. */
  requiredText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel,
  requiredText,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!isOpen) setTyped('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmed = !requiredText || typed === requiredText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{message}</p>
        {requiredText && (
          <div className="mt-4">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Type <span className="font-mono font-semibold">{requiredText}</span> to confirm:
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
