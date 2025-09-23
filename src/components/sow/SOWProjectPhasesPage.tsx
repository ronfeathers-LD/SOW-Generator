interface SOWProjectPhasesPageProps {
  customContent?: string;
  isEdited?: boolean;
}

// Function to strip inline styles from table elements only (preserve image styles)
function stripTableInlineStyles(html: string): string {
  if (!html) return '';
  
  // Remove style and class attributes from ONLY table-related elements
  const cleaned = html
    // Remove style attributes from table elements only
    .replace(/<table[^>]*style="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<thead[^>]*style="[^"]*"[^>]*>/gi, '<thead>')
    .replace(/<tbody[^>]*style="[^"]*"[^>]*>/gi, '<tbody>')
    .replace(/<tr[^>]*style="[^"]*"[^>]*>/gi, '<tr>')
    .replace(/<th[^>]*style="[^"]*"[^>]*>/gi, '<th>')
    .replace(/<td[^>]*style="[^"]*"[^>]*>/gi, '<td>')
    .replace(/<colgroup[^>]*style="[^"]*"[^>]*>/gi, '<colgroup>')
    .replace(/<col[^>]*style="[^"]*"[^>]*>/gi, '<col>')
    // Remove class attributes from table elements only
    .replace(/<table[^>]*class="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<thead[^>]*class="[^"]*"[^>]*>/gi, '<thead>')
    .replace(/<tbody[^>]*class="[^"]*"[^>]*>/gi, '<tbody>')
    .replace(/<tr[^>]*class="[^"]*"[^>]*>/gi, '<tr>')
    .replace(/<th[^>]*class="[^"]*"[^>]*>/gi, '<th>')
    .replace(/<td[^>]*class="[^"]*"[^>]*>/gi, '<td>')
    .replace(/<colgroup[^>]*class="[^"]*"[^>]*>/gi, '<colgroup>')
    .replace(/<col[^>]*class="[^"]*"[^>]*>/gi, '<col>')
    // Remove other table-specific attributes that might interfere
    .replace(/<table[^>]*min-width="[^"]*"[^>]*>/gi, '<table>')
    .replace(/<col[^>]*min-width="[^"]*"[^>]*>/gi, '<col>');
    
  return cleaned;
}

export default function SOWProjectPhasesPage({ customContent, isEdited }: SOWProjectPhasesPageProps) {
  const cleanedContent = stripTableInlineStyles(customContent || '');

  return (
    <div className="max-w-none text-left">
      {isEdited ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ <strong>Note:</strong> This content has been customized from the default template.
            </p>
          </div>
          
          {/* Project Phases Content */}
          <div 
            id="sow-content-project-phases"
            className="text-base leading-relaxed sow-content"
            dangerouslySetInnerHTML={{ __html: cleanedContent }}
          />
        </div>
      ) : (
        /* Project Phases Content */
        <div 
          id="sow-content-project-phases"
          className="text-base leading-relaxed sow-content"
          dangerouslySetInnerHTML={{ __html: cleanedContent }}
        />
      )}
    </div>
  );
} 