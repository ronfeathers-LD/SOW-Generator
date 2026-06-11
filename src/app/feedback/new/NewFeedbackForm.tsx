'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

type FeedbackType = 'bug' | 'feature';

const TYPE_OPTIONS: { value: FeedbackType; emoji: string; label: string; hint: string }[] = [
  { value: 'bug', emoji: '🐞', label: 'Bug', hint: 'Something is broken or behaving wrong' },
  { value: 'feature', emoji: '✨', label: 'Feature Request', hint: 'An idea or improvement' },
];

export default function NewFeedbackForm() {
  const router = useRouter();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ number: number; html_url: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || created) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim(), description: description.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit feedback');
      }
      setCreated({ number: data.number, html_url: data.html_url });
      // Give the user a beat to see the confirmation, then go back to the list
      // (?fresh=1 bypasses the server-side issue cache).
      setTimeout(() => router.push('/feedback?fresh=1'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Feedback</h1>

        {created ? (
          <div className="bg-white border border-gray-200 rounded-md p-8 text-center">
            <p className="text-gray-900 font-medium mb-1">Thanks — your feedback was filed!</p>
            <p className="text-sm text-gray-600">
              Created issue{' '}
              <a
                href={created.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                #{created.number}
              </a>
              . Taking you back to the list…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-6 space-y-6">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">Type</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer ${
                      type === option.value
                        ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <span className="text-xl leading-none" aria-hidden="true">{option.emoji}</span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                      <span className="block text-xs text-gray-500">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
              <input
                id="feedback-title"
                type="text"
                required
                maxLength={MAX_TITLE_LENGTH}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the issue or idea"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <span className="text-xs text-gray-400">
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                id="feedback-description"
                rows={8}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect? Steps to reproduce, or details about your idea."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                This lands on GitHub, so Markdown is supported.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Link
                href="/feedback"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
