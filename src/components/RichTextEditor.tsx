'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update textarea content when value prop changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
  };

  const insertText = (prefix: string, suffix: string = '') => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selectedText = text.substring(start, end);
      
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      textarea.value = newText;
      
      // Set cursor position
      if (selectedText) {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + selectedText.length;
      } else {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length;
      }
      
      onChange(newText);
      textarea.focus();
    }
  };

  const insertBulletList = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // Get the current line
      const beforeCursor = text.substring(0, start);
      const afterCursor = text.substring(end);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Add bullet point
      const newText = beforeCursor + '• ' + afterCursor;
      textarea.value = newText;
      
      // Set cursor position after bullet
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 2;
      
      onChange(newText);
      textarea.focus();
    }
  };

  const insertNumberedList = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // Get the current line
      const beforeCursor = text.substring(0, start);
      const afterCursor = text.substring(end);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Count existing numbered items to get next number
      const numberedLines = text.split('\n').filter(line => /^\d+\./.test(line.trim()));
      const nextNumber = numberedLines.length + 1;
      
      // Add numbered point
      const newText = beforeCursor + `${nextNumber}. ` + afterCursor;
      textarea.value = newText;
      
      // Set cursor position after number
      textarea.selectionStart = start + `${nextNumber}. `.length;
      textarea.selectionEnd = start + `${nextNumber}. `.length;
      
      onChange(newText);
      textarea.focus();
    }
  };

  const insertHeader = (level: number) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // Find the start of the current line
      let lineStart = start;
      while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
      }
      
      // Get the current line content
      const lineEnd = text.indexOf('\n', start);
      const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
      
      // Create header prefix
      const headerPrefix = '#'.repeat(level) + ' ';
      
      // Replace the line with header
      const newText = text.substring(0, lineStart) + headerPrefix + currentLine.trim() + text.substring(lineEnd === -1 ? text.length : lineEnd);
      textarea.value = newText;
      
      // Set cursor position after header
      const newCursorPos = lineStart + headerPrefix.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      
      onChange(newText);
      textarea.focus();
    }
  };

  const insertDivider = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      const divider = '\n---\n';
      const newText = text.substring(0, start) + divider + text.substring(end);
      textarea.value = newText;
      
      // Set cursor position after divider
      textarea.selectionStart = start + divider.length;
      textarea.selectionEnd = start + divider.length;
      
      onChange(newText);
      textarea.focus();
    }
  };

  return (
    <div className={`border rounded-md ${isFocused ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap gap-2">
        {/* Headers */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">H:</span>
          <button
            type="button"
            onClick={() => insertHeader(1)}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
            title="Header 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertHeader(2)}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
            title="Header 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertHeader(3)}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
            title="Header 3"
          >
            H3
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertText('**', '**')}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertText('`', '`')}
            className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 font-mono"
            title="Code"
          >
            &lt;/&gt;
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={insertBulletList}
            className="p-2 rounded hover:bg-gray-200 text-gray-700"
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={insertNumberedList}
            className="p-2 rounded hover:bg-gray-200 text-gray-700"
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 000 2h1a1 1 0 100-2H3zM3 10a1 1 0 000 2h1a1 1 0 100-2H3zM3 16a1 1 0 000 2h1a1 1 0 100-2H3zM6 4a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zM6 10a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zM6 16a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1z"/>
            </svg>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Special Elements */}
        <button
          type="button"
          onClick={insertDivider}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700"
          title="Horizontal Divider"
        >
          —
        </button>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full min-h-[250px] p-3 focus:outline-none resize-none font-mono text-sm"
        style={{
          lineHeight: '1.6',
          fontSize: '14px'
        }}
      />
    </div>
  );
} 