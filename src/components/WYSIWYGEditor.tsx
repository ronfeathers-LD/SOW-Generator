'use client';

import { useState, useRef, useEffect } from 'react';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function WYSIWYGEditor({ value, onChange, placeholder }: WYSIWYGEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
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
          const rows = table.rows;
          
          for (let i = 0; i < rows.length; i++) {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) {
              cell.style.border = '1px solid #ddd';
              cell.style.padding = '8px';
              cell.style.textAlign = 'left';
              cell.style.backgroundColor = '#f2f2f2';
              cell.textContent = 'Header';
            } else {
              cell.style.border = '1px solid #ddd';
              cell.style.padding = '8px';
              cell.textContent = 'Cell';
            }
            rows[i].insertBefore(cell, rows[i].cells[cellIndex + 1] || null);
          }
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
          const rows = table.rows;
          
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].cells[cellIndex]) {
              rows[i].deleteCell(cellIndex);
            }
          }
          handleInput();
        }
      }
    }
  };

  return (
    <div className={`border rounded-md ${isFocused ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap gap-2">
        {/* Text Formatting */}
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
              <path d="M3 4a1 1 0 000 2h1a1 1 0 100-2H3zM3 10a1 1 0 000 2h1a1 1 0 100-2H3zM3 16a1 1 0 000 2h1a1 1 0 100-2H3zM6 4a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zM6 10a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zM6 16a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1z"/>
            </svg>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Tables */}
        <div className="flex items-center gap-1">
          <div className="relative group">
            <button
              type="button"
              className="p-2 rounded hover:bg-gray-200 text-gray-700 flex items-center gap-1"
              title="Insert Table"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
              </svg>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-2 space-y-1">
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
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-2 rounded hover:bg-gray-200 text-gray-700"
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-2 rounded hover:bg-gray-200 text-gray-700"
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full min-h-[250px] p-3 focus:outline-none"
        style={{
          lineHeight: '1.6',
          fontSize: '14px'
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
} 