'use client';

import React, { useState, useEffect } from 'react';

interface ChangeDiff {
  field_name: string;
  previous_value: string;
  new_value: string;
  change_type: 'field_update' | 'content_edit' | 'status_change';
  diff_summary: string;
}

interface DiffData {
  sow1: {
    id: string;
    version: number;
    status: string;
    created_at: string;
  };
  sow2: {
    id: string;
    version: number;
    status: string;
    created_at: string;
  };
  changes: ChangeDiff[];
  totalChanges: number;
}

interface SOWRevisionDiffProps {
  sowId1: string;
  sowId2: string;
  onClose: () => void;
}

// Helper function to parse JSON and extract HTML content
function parseHTMLFromJSON(value: string): { isHTML: boolean; content: string; rawValue: string } {
  if (!value || value.trim() === '') {
    return { isHTML: false, content: '', rawValue: value };
  }

  // Check if it's a JSON string
  if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      // If it's an object, try to find HTML content
      if (typeof parsed === 'object' && parsed !== null) {
        // Check common HTML content fields
        const htmlFields = ['content', 'html', 'text', 'body', 'value'];
        for (const field of htmlFields) {
          if (parsed[field] && typeof parsed[field] === 'string') {
            // Check if it contains HTML tags
            if (parsed[field].includes('<') && parsed[field].includes('>')) {
              return { isHTML: true, content: parsed[field], rawValue: value };
            }
          }
        }
        // If the object itself is a string (like {"type": "doc", "content": [...]})
        // Return the stringified version for now
        return { isHTML: false, content: JSON.stringify(parsed, null, 2), rawValue: value };
      }
      // If parsed is a string, check if it's HTML
      if (typeof parsed === 'string' && parsed.includes('<') && parsed.includes('>')) {
        return { isHTML: true, content: parsed, rawValue: value };
      }
    } catch {
      // Not valid JSON, continue to check if it's HTML
    }
  }

  // Check if the string itself contains HTML tags
  if (value.includes('<') && value.includes('>')) {
    return { isHTML: true, content: value, rawValue: value };
  }

  return { isHTML: false, content: value, rawValue: value };
}

// Helper function to compute word-level diff and return highlighted HTML
function computeDiff(prev: string, next: string, isHtml: boolean = false): { prevHtml: string; nextHtml: string } {
  if (!prev && !next) {
    return { prevHtml: '', nextHtml: '' };
  }
  
  if (!prev) {
    return {
      prevHtml: '<span class="text-gray-400 italic">(empty)</span>',
      nextHtml: isHtml 
        ? `<span class="bg-green-200 text-green-900 px-1 rounded">${next}</span>`
        : `<span class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(next)}</span>`
    };
  }
  
  if (!next) {
    return {
      prevHtml: isHtml
        ? `<span class="bg-red-200 text-red-900 px-1 rounded line-through">${prev}</span>`
        : `<span class="bg-red-200 text-red-900 px-1 rounded line-through">${escapeHtml(prev)}</span>`,
      nextHtml: '<span class="text-gray-400 italic">(empty)</span>'
    };
  }

  // For HTML content, we need a different approach - compare character by character in a smarter way
  if (isHtml) {
    // Normalize whitespace for comparison
    const prevNormalized = prev.replace(/\s+/g, ' ').trim();
    const nextNormalized = next.replace(/\s+/g, ' ').trim();
    
    if (prevNormalized === nextNormalized) {
      // No difference after normalization
      return { prevHtml: prev, nextHtml: next };
    }
    
    // Find the differences at a character level for HTML
    return computeHtmlDiff(prev, next);
  }

  // Simple word-level diff for plain text
  const prevWords = prev.split(/(\s+)/);
  const nextWords = next.split(/(\s+)/);
  
  // Use a simple longest common subsequence approach
  const diff = computeWordDiff(prevWords, nextWords);
  
  const prevHtml = diff.map(item => {
    if (item.type === 'removed') {
      return `<span class="bg-red-200 text-red-900 px-1 rounded line-through">${escapeHtml(item.value)}</span>`;
    } else if (item.type === 'common') {
      return escapeHtml(item.value);
    }
    return '';
  }).join('');
  
  const nextHtml = diff.map(item => {
    if (item.type === 'added') {
      return `<span class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(item.value)}</span>`;
    } else if (item.type === 'common') {
      return escapeHtml(item.value);
    }
    return '';
  }).join('');
  
  return { prevHtml, nextHtml };
}

// Compute diff for HTML content by finding character-level differences
function computeHtmlDiff(prev: string, next: string): { prevHtml: string; nextHtml: string } {
  // Use a more sophisticated approach: find all differences, not just prefix/suffix
  // This handles cases where differences are in the middle of the content
  
  // First, try to find a common prefix
  let prefixEnd = 0;
  const minLen = Math.min(prev.length, next.length);
  while (prefixEnd < minLen && prev[prefixEnd] === next[prefixEnd]) {
    prefixEnd++;
  }
  
  // Then find common suffix from the remaining parts
  let suffixStart = 0;
  const prevRemaining = prev.length - prefixEnd;
  const nextRemaining = next.length - prefixEnd;
  const maxSuffix = Math.min(prevRemaining, nextRemaining);
  
  while (
    suffixStart < maxSuffix &&
    prev[prev.length - 1 - suffixStart] === next[next.length - 1 - suffixStart]
  ) {
    suffixStart++;
  }
  
  // Extract the differing middle sections
  const prevDiff = prev.substring(prefixEnd, prev.length - suffixStart);
  const nextDiff = next.substring(prefixEnd, next.length - suffixStart);
  const prefix = prev.substring(0, prefixEnd);
  const suffix = prev.substring(prev.length - suffixStart);
  
  // If the differences are small, highlight them character by character
  // Otherwise, highlight the entire differing section
  let prevHighlighted = '';
  let nextHighlighted = '';
  
  if (prevDiff.length < 100 && nextDiff.length < 100) {
    // For small diffs, do a more detailed character-by-character comparison
    const maxLen = Math.max(prevDiff.length, nextDiff.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= prevDiff.length) {
        // Only in next
        nextHighlighted += `<span class="bg-green-200 text-green-900">${escapeHtml(nextDiff[i])}</span>`;
      } else if (i >= nextDiff.length) {
        // Only in prev
        prevHighlighted += `<span class="bg-red-200 text-red-900 line-through">${escapeHtml(prevDiff[i])}</span>`;
      } else if (prevDiff[i] === nextDiff[i]) {
        // Common character
        prevHighlighted += escapeHtml(prevDiff[i]);
        nextHighlighted += escapeHtml(nextDiff[i]);
      } else {
        // Different characters
        prevHighlighted += `<span class="bg-red-200 text-red-900 line-through">${escapeHtml(prevDiff[i])}</span>`;
        nextHighlighted += `<span class="bg-green-200 text-green-900">${escapeHtml(nextDiff[i])}</span>`;
      }
    }
  } else {
    // For larger diffs, highlight the entire section
    prevHighlighted = prevDiff ? `<span class="bg-red-200 text-red-900 px-1 rounded line-through">${escapeHtml(prevDiff)}</span>` : '';
    nextHighlighted = nextDiff ? `<span class="bg-green-200 text-green-900 px-1 rounded">${escapeHtml(nextDiff)}</span>` : '';
  }
  
  const prevHtml = prefix + prevHighlighted + suffix;
  const nextHtml = prefix + nextHighlighted + suffix;
  
  return { prevHtml, nextHtml };
}

// Simple word diff algorithm using a more efficient approach
function computeWordDiff(prevWords: string[], nextWords: string[]): Array<{type: 'common' | 'removed' | 'added', value: string}> {
  const result: Array<{type: 'common' | 'removed' | 'added', value: string}> = [];
  
  // For very long texts, limit the lookahead to prevent performance issues
  const MAX_LOOKAHEAD = 50;
  
  let i = 0, j = 0;
  
  while (i < prevWords.length || j < nextWords.length) {
    if (i >= prevWords.length) {
      // Only next words remain
      result.push({ type: 'added', value: nextWords[j] });
      j++;
    } else if (j >= nextWords.length) {
      // Only prev words remain
      result.push({ type: 'removed', value: prevWords[i] });
      i++;
    } else if (prevWords[i] === nextWords[j]) {
      // Words match
      result.push({ type: 'common', value: prevWords[i] });
      i++;
      j++;
    } else {
      // Words don't match - look ahead to find next match
      const foundMatch = false;
      let bestMatch = { prevIdx: -1, nextIdx: -1, distance: Infinity };
      
      // Look ahead in both arrays (limited to prevent performance issues)
      const lookAheadLimit = Math.min(MAX_LOOKAHEAD, Math.max(prevWords.length - i, nextWords.length - j));
      
      for (let offset = 1; offset <= lookAheadLimit && !foundMatch; offset++) {
        // Check if current prev word matches future next word
        if (j + offset < nextWords.length && prevWords[i] === nextWords[j + offset]) {
          if (offset < bestMatch.distance) {
            bestMatch = { prevIdx: i, nextIdx: j + offset, distance: offset };
          }
        }
        // Check if current next word matches future prev word
        if (i + offset < prevWords.length && prevWords[i + offset] === nextWords[j]) {
          if (offset < bestMatch.distance) {
            bestMatch = { prevIdx: i + offset, nextIdx: j, distance: offset };
          }
        }
      }
      
      if (bestMatch.distance < Infinity) {
        // Found a match - process the gap
        if (bestMatch.nextIdx > j) {
          // Words were added
          for (let k = j; k < bestMatch.nextIdx; k++) {
            result.push({ type: 'added', value: nextWords[k] });
          }
          j = bestMatch.nextIdx;
        }
        if (bestMatch.prevIdx > i) {
          // Words were removed
          for (let k = i; k < bestMatch.prevIdx; k++) {
            result.push({ type: 'removed', value: prevWords[k] });
          }
          i = bestMatch.prevIdx;
        }
      } else {
        // No match found - mark both as changed
        result.push({ type: 'removed', value: prevWords[i] });
        result.push({ type: 'added', value: nextWords[j] });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Helper function to format client roles array as readable user list
function formatClientRoles(value: string): { isClientRoles: boolean; formatted: string } {
  if (!value || value.trim() === '') {
    return { isClientRoles: false, formatted: value };
  }

  // Check if it's a JSON array
  if (value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if it looks like client roles (has objects with name, email, role properties)
        const firstItem = parsed[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          const hasClientRoleFields = 
            (firstItem.name !== undefined || firstItem.email !== undefined) &&
            (firstItem.role !== undefined || firstItem.contact_title !== undefined);
          
          if (hasClientRoleFields) {
            // Format as a readable list
            const formatted = parsed.map((role: {
              role?: string;
              contact_title?: string;
              name?: string;
              email?: string;
              responsibilities?: string;
            }, index: number) => {
              const roleName = role.role || role.contact_title || 'N/A';
              const userName = role.name || 'N/A';
              const userEmail = role.email || '';
              const responsibilities = role.responsibilities || '';
              
              return `${index + 1}. ${roleName}\n   User: ${userName}${userEmail ? ` (${userEmail})` : ''}${responsibilities ? `\n   Responsibilities: ${responsibilities}` : ''}`;
            }).join('\n\n');
            
            return { isClientRoles: true, formatted };
          }
        }
      }
    } catch {
      // Not valid JSON or not client roles
    }
  }

  return { isClientRoles: false, formatted: value };
}

// Component for rendering a single change item
function ChangeItem({ change }: { change: ChangeDiff }) {
  const prevParsed = parseHTMLFromJSON(change.previous_value || '');
  const newParsed = parseHTMLFromJSON(change.new_value || '');
  const prevClientRoles = formatClientRoles(change.previous_value || '');
  const newClientRoles = formatClientRoles(change.new_value || '');
  const isClientRolesField = change.field_name === 'client_roles' || change.field_name === 'clientRoles';
  const [showRawPrev, setShowRawPrev] = useState(false);
  const [showRawNew, setShowRawNew] = useState(false);
  const [showDiffHighlight, setShowDiffHighlight] = useState(true);
  
  // Compute diff highlighting - now supports both plain text and HTML
  const canShowDiff = !isClientRolesField; // Can show diff for both text and HTML
  const isHtmlContent = prevParsed.isHTML || newParsed.isHTML;
  const prevText = canShowDiff ? (change.previous_value || '') : '';
  const newText = canShowDiff ? (change.new_value || '') : '';
  const textDiff = canShowDiff ? computeDiff(prevText, newText, isHtmlContent) : { prevHtml: '', nextHtml: '' };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'status_change': return 'bg-purple-100 text-purple-800';
      case 'content_edit': return 'bg-blue-100 text-blue-800';
      case 'field_update': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'status_change': return '🔄';
      case 'content_edit': return '📝';
      case 'field_update': return '✏️';
      default: return '📄';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getChangeTypeIcon(change.change_type)}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getChangeTypeColor(change.change_type)}`}>
            {change.change_type.replace('_', ' ').toUpperCase()}
          </span>
          <span className="font-medium text-gray-900">
            {change.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-700">{change.diff_summary}</p>
        {canShowDiff && (
          <button
            onClick={() => setShowDiffHighlight(!showDiffHighlight)}
            className="text-xs text-gray-600 hover:text-gray-800 underline"
          >
            {showDiffHighlight ? 'Hide Highlights' : 'Show Highlights'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-red-700">Previous Value:</div>
            {(prevParsed.isHTML || (isClientRolesField && prevClientRoles.isClientRoles)) && (
              <button
                onClick={() => setShowRawPrev(!showRawPrev)}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                {showRawPrev ? (prevParsed.isHTML ? 'Show HTML' : 'Show Formatted') : 'Show Raw'}
              </button>
            )}
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-2 text-gray-800 break-words max-h-64 overflow-y-auto">
            {change.previous_value ? (
              showRawPrev ? (
                <pre className="text-xs whitespace-pre-wrap font-mono">{change.previous_value}</pre>
              ) : isClientRolesField && prevClientRoles.isClientRoles ? (
                <pre className="text-sm whitespace-pre-wrap font-sans">{prevClientRoles.formatted}</pre>
              ) : prevParsed.isHTML ? (
                canShowDiff && showDiffHighlight ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: textDiff.prevHtml }}
                  />
                ) : (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: prevParsed.content }}
                  />
                )
              ) : canShowDiff && showDiffHighlight ? (
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: textDiff.prevHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{prevParsed.content}</div>
              )
            ) : (
              <span className="text-gray-400 italic">(empty)</span>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-green-700">New Value:</div>
            {(newParsed.isHTML || (isClientRolesField && newClientRoles.isClientRoles)) && (
              <button
                onClick={() => setShowRawNew(!showRawNew)}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                {showRawNew ? (newParsed.isHTML ? 'Show HTML' : 'Show Formatted') : 'Show Raw'}
              </button>
            )}
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-2 text-gray-800 break-words max-h-64 overflow-y-auto">
            {change.new_value ? (
              showRawNew ? (
                <pre className="text-xs whitespace-pre-wrap font-mono">{change.new_value}</pre>
              ) : isClientRolesField && newClientRoles.isClientRoles ? (
                <pre className="text-sm whitespace-pre-wrap font-sans">{newClientRoles.formatted}</pre>
              ) : newParsed.isHTML ? (
                canShowDiff && showDiffHighlight ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: textDiff.nextHtml }}
                  />
                ) : (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: newParsed.content }}
                  />
                )
              ) : canShowDiff && showDiffHighlight ? (
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: textDiff.nextHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{newParsed.content}</div>
              )
            ) : (
              <span className="text-gray-400 italic">(empty)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SOWRevisionDiff({ sowId1, sowId2, onClose }: SOWRevisionDiffProps) {
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sow/${sowId1}/diff?compareWith=${sowId2}`);
        if (response.ok) {
          const data = await response.json();
          setDiffData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load diff');
        }
      } catch {
        setError('Error loading diff');
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [sowId1, sowId2]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="text-red-600">{error}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!diffData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revision Comparison</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comparing Version {diffData.sow1.version} vs Version {diffData.sow2.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Revision Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Version {diffData.sow1.version}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(diffData.sow1.created_at).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Status: <span className="font-medium">{diffData.sow1.status}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Version {diffData.sow2.version}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(diffData.sow2.created_at).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Status: <span className="font-medium">{diffData.sow2.status}</span>
            </div>
          </div>
        </div>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {diffData.totalChanges === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No differences found between these revisions.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 mb-4">
                {diffData.totalChanges} change{diffData.totalChanges !== 1 ? 's' : ''} found
              </div>
              {diffData.changes.map((change, index) => (
                <ChangeItem key={index} change={change} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

