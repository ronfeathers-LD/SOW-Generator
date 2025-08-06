'use client';

import { useState, useRef, useEffect } from 'react';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function WYSIWYGEditor({ value, onChange, placeholder }: WYSIWYGEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Clear and set content to avoid any potential issues
      editorRef.current.innerHTML = '';
      if (value) {
        editorRef.current.innerHTML = value;
      }
    }
    setHtmlValue(value);
  }, [value]);

  // Update editor content when switching from HTML to WYSIWYG mode
  useEffect(() => {
    if (!isHtmlMode && editorRef.current && htmlValue) {
      // Small delay to ensure the DOM element is ready
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlValue;
        }
      }, 0);
    }
  }, [isHtmlMode, htmlValue]);

  // Handle mode switching
  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching from HTML to WYSIWYG
      // The content will be updated by the useEffect above
      // Notify parent of the change
      onChange(htmlValue);
    } else {
      // Switching from WYSIWYG to HTML
      // Capture current WYSIWYG content
      const currentContent = editorRef.current?.innerHTML || '';
      setHtmlValue(currentContent);
    }
    setIsHtmlMode(!isHtmlMode);
  };

  // Handle HTML textarea changes
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setHtmlValue(newValue);
    // Only call onChange if we're in HTML mode to avoid conflicts
    if (isHtmlMode) {
      onChange(newValue);
    }
  };

  const handleInput = () => {
    if (editorRef.current && !isHtmlMode) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertTable = (rows: number = 3, cols: number = 3) => {
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    
    // Create header row
    tableHTML += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
      tableHTML += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Header</th>';
    }
    tableHTML += '</tr></thead>';
    
    // Create body rows
    tableHTML += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>';
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    document.execCommand('insertHTML', false, tableHTML);
    editorRef.current?.focus();
    handleInput();
  };

  const insertTableRow = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const tableCell = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement?.closest('td, th')
        : (range.commonAncestorContainer as Element)?.closest('td, th');
      
      if (tableCell) {
        const table = tableCell.closest('table');
        const row = tableCell.closest('tr');
        if (table && row) {
          const newRow = document.createElement('tr');
          const colCount = row.cells.length;
          
          for (let i = 0; i < colCount; i++) {
            const cell = document.createElement('td');
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.textContent = 'Cell';
            newRow.appendChild(cell);
          }
          
          row.parentNode?.insertBefore(newRow, row.nextSibling);
          handleInput();
        }
      }
    }
  };

  const insertTableColumn = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const tableCell = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement?.closest('td, th')
        : (range.commonAncestorContainer as Element)?.closest('td, th');
      
      if (tableCell) {
        const table = tableCell.closest('table');
        const row = tableCell.closest('tr');
        if (table && row) {
          const cellIndex = Array.from(row.cells).indexOf(tableCell as HTMLTableCellElement);
          
          // Insert column in all rows
          const rows = table.querySelectorAll('tr');
          rows.forEach((tableRow, rowIndex) => {
            const newCell = document.createElement(rowIndex === 0 ? 'th' : 'td');
            newCell.style.border = '1px solid #ddd';
            newCell.style.padding = '8px';
            newCell.textContent = rowIndex === 0 ? 'Header' : 'Cell';
            
            if (tableRow.cells[cellIndex]) {
              tableRow.insertBefore(newCell, tableRow.cells[cellIndex].nextSibling);
            } else {
              tableRow.appendChild(newCell);
            }
          });
          
          handleInput();
        }
      }
    }
  };

  const deleteTableRow = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const tableCell = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement?.closest('td, th')
        : (range.commonAncestorContainer as Element)?.closest('td, th');
      
      if (tableCell) {
        const row = tableCell.closest('tr');
        if (row && row.parentNode) {
          row.parentNode.removeChild(row);
          handleInput();
        }
      }
    }
  };

  const deleteTableColumn = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const tableCell = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement?.closest('td, th')
        : (range.commonAncestorContainer as Element)?.closest('td, th');
      
      if (tableCell) {
        const table = tableCell.closest('table');
        const row = tableCell.closest('tr');
        if (table && row) {
          const cellIndex = Array.from(row.cells).indexOf(tableCell as HTMLTableCellElement);
          
          // Delete column from all rows
          const rows = table.querySelectorAll('tr');
          rows.forEach((tableRow) => {
            if (tableRow.cells[cellIndex]) {
              tableRow.removeChild(tableRow.cells[cellIndex]);
            }
          });
          
          handleInput();
        }
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex items-center gap-2 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleHtmlMode}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              isHtmlMode 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isHtmlMode ? 'Switch to WYSIWYG Mode' : 'Switch to HTML Mode'}
          >
            {isHtmlMode ? 'WYSIWYG' : 'HTML'}
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>
        {/* Text Formatting - Only show in WYSIWYG mode */}
        {!isHtmlMode && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => execCommand('bold')}
              className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => execCommand('underline')}
              className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 underline"
              title="Underline"
            >
              U
            </button>
          </div>
        )}

        {!isHtmlMode && (
          <>
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Headers */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">H:</span>
              <button
                type="button"
                onClick={() => execCommand('formatBlock', '<h1>')}
                className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
                title="Header 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execCommand('formatBlock', '<h2>')}
                className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
                title="Header 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execCommand('formatBlock', '<h3>')}
                className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm font-bold"
                title="Header 3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => execCommand('formatBlock', '<p>')}
                className="px-2 py-1 rounded hover:bg-gray-200 text-gray-700 text-sm"
                title="Paragraph"
              >
                P
              </button>
            </div>
          </>
        )}

        {!isHtmlMode && (
          <>
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Lists */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => execCommand('insertUnorderedList')}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Bullet List"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => execCommand('insertOrderedList')}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Numbered List"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {!isHtmlMode && (
          <>
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Alignment */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => execCommand('justifyLeft')}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Align Left"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => execCommand('justifyCenter')}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Align Center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => execCommand('justifyRight')}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Align Right"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {!isHtmlMode && (
          <>
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Tables */}
            <div className="flex items-center gap-1">
              <div className="relative group">
                <button
                  type="button"
                  className="p-2 rounded hover:bg-gray-200 text-gray-700"
                  title="Insert Table"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                </button>
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    type="button"
                    onClick={() => insertTable(2, 2)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    2×2 Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTable(3, 3)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    3×3 Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTable(3, 4)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    3×4 Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTable(4, 4)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    4×4 Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTable(5, 4)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    5×4 Table
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={insertTableRow}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Add Table Row"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={insertTableColumn}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Add Table Column"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM3.293 7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={deleteTableRow}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Delete Table Row"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3.293 7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={deleteTableColumn}
                className="p-2 rounded hover:bg-gray-200 text-gray-700"
                title="Delete Table Column"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM3.293 7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor */}
      {isHtmlMode ? (
        <textarea
          ref={textareaRef}
          value={htmlValue}
          onChange={handleHtmlChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full min-h-[250px] p-3 focus:outline-none border-0 resize-none font-mono text-sm"
          style={{
            lineHeight: '1.6',
            fontSize: '14px'
          }}
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full min-h-[250px] p-3 focus:outline-none wysiwyg-content"
          style={{
            lineHeight: '1.6',
            fontSize: '14px',
            direction: 'ltr',
            textAlign: 'left'
          }}
          data-placeholder={placeholder}
        />
      )}
    </div>
  );
} 