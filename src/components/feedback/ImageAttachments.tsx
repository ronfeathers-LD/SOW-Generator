'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Kept in sync with src/app/api/upload/image/route.ts and github-issues.ts.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_COUNT = 10;

interface AttachmentItem {
  localId: string;
  name: string;
  previewUrl: string; // object URL for the thumbnail
  status: 'uploading' | 'done' | 'error';
  url?: string; // public URL once uploaded
  error?: string;
}

interface ImageAttachmentsProps {
  /** Fires whenever the set of uploaded URLs or the pending state changes. */
  onChange: (urls: string[], pending: boolean) => void;
}

let idCounter = 0;
const nextId = () => `att-${Date.now()}-${idCounter++}`;

/**
 * Screenshot picker for feedback: choose files or paste from the clipboard,
 * each uploaded to the shared /api/upload/image endpoint (Supabase public
 * bucket). Reports the uploaded public URLs and whether any upload is still in
 * flight so the parent can block submit until they finish.
 */
export default function ImageAttachments({ onChange }: ImageAttachmentsProps) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const itemsRef = useRef<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single writer for both state and the ref, and the only place we notify the
  // parent — keeps the reported URLs/pending flag in lockstep with the list.
  const commit = useCallback(
    (next: AttachmentItem[]) => {
      itemsRef.current = next;
      setItems(next);
      const urls = next.filter((i) => i.status === 'done' && i.url).map((i) => i.url!);
      onChange(urls, next.some((i) => i.status === 'uploading'));
    },
    [onChange]
  );

  const patchItem = useCallback(
    (localId: string, patch: Partial<AttachmentItem>) => {
      commit(itemsRef.current.map((i) => (i.localId === localId ? { ...i, ...patch } : i)));
    },
    [commit]
  );

  const uploadFile = useCallback(
    async (file: File, localId: string) => {
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload/image', { method: 'POST', body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed');
        patchItem(localId, { status: 'done', url: data.url });
      } catch (err) {
        patchItem(localId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [patchItem]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const current = itemsRef.current;
      const room = Math.max(0, MAX_COUNT - current.length);
      const accepted = files
        .filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_BYTES)
        .slice(0, room);
      if (accepted.length === 0) return;

      const created = accepted.map((file) => ({
        file,
        item: {
          localId: nextId(),
          name: file.name || 'screenshot',
          previewUrl: URL.createObjectURL(file),
          status: 'uploading' as const,
        },
      }));
      commit([...current, ...created.map((c) => c.item)]);
      created.forEach((c) => void uploadFile(c.file, c.item.localId));
    },
    [commit, uploadFile]
  );

  const removeItem = useCallback(
    (localId: string) => {
      const target = itemsRef.current.find((i) => i.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      commit(itemsRef.current.filter((i) => i.localId !== localId));
    },
    [commit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files);
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

  const atCapacity = items.length >= MAX_COUNT;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-dark-text">
        Screenshots
      </label>

      <div
        onPaste={handlePaste}
        className="rounded-md border border-dashed border-gray-300 p-3 text-sm dark:border-dark-border"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atCapacity}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-dark-surface dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-elevated"
          >
            Add images
          </button>
          <span className="text-xs text-gray-500 dark:text-dark-text-muted">
            or paste a screenshot here · PNG/JPEG/GIF/WebP · up to {MAX_COUNT}, 5 MB each
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = ''; // allow re-selecting the same file
          }}
        />

        {items.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <li
                key={item.localId}
                className="relative rounded-md border border-gray-200 overflow-hidden group dark:border-dark-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview */}
                <img src={item.previewUrl} alt={item.name} className="h-20 w-full object-cover" />
                {item.status !== 'done' && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${
                      item.status === 'error'
                        ? 'bg-red-900/60 text-red-100'
                        : 'bg-black/50 text-white'
                    }`}
                  >
                    {item.status === 'uploading' ? 'Uploading…' : 'Failed'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.localId)}
                  aria-label={`Remove ${item.name}`}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
