'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect, useRef, useCallback } from 'react';

interface TipTapEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  initializing?: boolean;
}

export default function TipTapEditor({ value, onChange = () => {}, placeholder, initializing = false }: TipTapEditorProps) {
  const isSettingContent = useRef(false);
  const lastExternalValue = useRef(value);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUserTyping = useRef(false);
  
  // Debounced onChange function
  const debouncedOnChange = useCallback((html: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      lastExternalValue.current = html;
      isUserTyping.current = false;
      onChange(html);
    }, 100); // 100ms debounce
  }, [onChange]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);
  
  // Helper function to check if content is HTML
  const isHtmlContent = (content: string): boolean => {
    if (!content) return false;
    const trimmed = content.trim();
    return trimmed.startsWith('<') && trimmed.includes('>');
  };

  // Helper function to clean HTML content for TipTap
  const cleanHtmlForTipTap = useCallback((html: string): string => {
    if (!html) return '';
    
    // If it's already HTML, return as is - don't modify it
    if (isHtmlContent(html)) {
      // Additional check: if it contains proper list structure, return unchanged
      if (html.includes('<ul>') && html.includes('<li>')) {
        return html;
      }
      if (html.includes('<ol>') && html.includes('<li>')) {
        return html;
      }
      // For other HTML content, return as is
      return html;
    }
    
    // If it's plain text, convert to basic HTML but be conservative
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let currentList: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        // If we have a current list, close it
        if (currentList.length > 0) {
          processedLines.push(`<ul class="list-disc pl-6 prose prose-md max-w-none">${currentList.join('')}</ul>`);
          currentList = [];
        }
        return;
      }
      
      // Handle bullet points - collect in current list
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
        currentList.push(`<li>${trimmed.substring(2)}</li>`);
        return;
      }
      
      // Handle numbered lists - collect in current list
      if (/^\d+\.\s/.test(trimmed)) {
        currentList.push(`<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`);
        return;
      }
      
              // If we have a current list and encounter non-list content, close the list first
        if (currentList.length > 0) {
          processedLines.push(`<ul class="list-disc pl-6 prose prose-md max-w-none">${currentList.join('')}</ul>`);
          currentList = [];
        }
      
      // Handle bold text
      let processed = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Handle italic text
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Wrap in <p> tag
      processedLines.push(`<p>${processed}</p>`);
    });
    
    // Close any remaining list
    if (currentList.length > 0) {
      processedLines.push(`<ul class="list-disc pl-6 prose prose-md max-w-none">${currentList.join('')}</ul>`);
    }
    
    return processedLines.join('');
  }, []);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: {
          HTMLAttributes: {
            // Remove custom class to prevent wrapper elements
          },
        },
        paragraph: {
          HTMLAttributes: {
            // Remove custom class to prevent wrapper elements
          },
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: cleanHtmlForTipTap(value),
    onUpdate: ({ editor }) => {
      if (!initializing && !isSettingContent.current) {
        // Mark that user is typing
        isUserTyping.current = true;
        
        // Get the HTML from TipTap
        let html = editor.getHTML();
        
        // Clean up unwanted paragraph tags that TipTap adds around list items
        // This happens because TipTap internally wraps list item content in paragraphs
        html = html.replace(/<p>(<li[^>]*>.*?<\/li>)<\/p>/g, '$1');
        
        // Also clean up any empty paragraphs that might be left
        html = html.replace(/<p><\/p>/g, '');
        
        // Fix list structure: ensure list items are properly wrapped in ul/ol tags
        // This handles cases where TipTap generates individual <li> elements without proper list containers
        html = html.replace(/(<li[^>]*>.*?<\/li>)(?=\s*<li[^>]*>)/g, '<ul>$1');
        html = html.replace(/(<li[^>]*>.*?<\/li>)(?=\s*<[^l]|$)/g, '$1</ul>');
        
        // Clean up any duplicate ul tags that might have been created
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        // Use debounced onChange to prevent too frequent updates
        debouncedOnChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[250px] p-3 focus:outline-none prose prose-sm max-w-none',
        placeholder: placeholder || '',
      },
      // Disable automatic HTML cleaning and normalization
      transformPastedHTML: (html) => html,
      transformCopied: (slice) => slice,
    },
    // Disable automatic content processing
    parseOptions: {
      preserveWhitespace: 'full',
    },
    immediatelyRender: false,
  });

  // Update editor content when value prop changes (only for external changes)
  useEffect(() => {
    if (editor && value !== lastExternalValue.current && !isUserTyping.current) {
      // This is an external change, not a user typing change
      isSettingContent.current = true;
      editor.commands.setContent(cleanHtmlForTipTap(value));
      lastExternalValue.current = value;
      
      // Reset the flag after a short delay to allow the setContent to complete
      setTimeout(() => {
        isSettingContent.current = false;
      }, 0);
    }
  }, [editor, value, cleanHtmlForTipTap]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 font-bold ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 italic ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 underline ${
            editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Underline"
        >
          U
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Numbered List"
        >
          1.
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={addLink}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-gray-700 ${
            editor.isActive('link') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Add Link"
        >
          🔗
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700"
          title="Insert Table"
        >
          📊
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          disabled={!editor.can().addColumnBefore()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add Column Before"
        >
          ➕
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.can().addColumnAfter()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add Column After"
        >
          ➕
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!editor.can().deleteColumn()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Column"
        >
          ➖
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          disabled={!editor.can().addRowBefore()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add Row Before"
        >
          ⬆️
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.can().addRowAfter()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add Row After"
        >
          ⬇️
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          disabled={!editor.can().deleteRow()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Row"
        >
          🗑️
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Table"
        >
          🗑️📊
        </button>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="w-full"
      />
      <style jsx>{`
        .ProseMirror table {
          border-collapse: collapse;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        
        .ProseMirror table td,
        .ProseMirror table th {
          border: 2px solid #ced4da;
          box-sizing: border-box;
          min-width: 1em;
          padding: 3px 5px;
          position: relative;
          vertical-align: top;
        }
        
        .ProseMirror table th {
          background-color: #f8f9fa;
          font-weight: bold;
          text-align: left;
        }
        
        .ProseMirror table .selectedCell:after {
          background: rgba(200, 200, 255, 0.4);
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        
        .ProseMirror table .column-resize-handle {
          background-color: #adf;
          bottom: -2px;
          position: absolute;
          right: -2px;
          pointer-events: none;
          top: 0;
          width: 4px;
        }
        
        .ProseMirror table p {
          margin: 0;
        }
        
        /* Fix list item paragraph wrapping */
        .ProseMirror li p {
          margin: 0;
          display: inline;
        }
        
        .ProseMirror li {
          margin: 0.25em 0;
        }
        
        /* Prevent automatic paragraph wrapping in list items */
        .ProseMirror ul li,
        .ProseMirror ol li {
          display: list-item;
        }
        
        .ProseMirror ul li p,
        .ProseMirror ol li p {
          display: inline;
          margin: 0;
        }
        
        /* Remove extra spacing from paragraphs */
        .ProseMirror p {
          margin: 0.5em 0;
        }
        
        /* Ensure list items don't get extra wrapper elements */
        .ProseMirror li > p:only-child {
          margin: 0;
        }
      `}</style>
    </div>
  );
} 