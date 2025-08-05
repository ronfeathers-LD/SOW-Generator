export function textToHtml(text: string): string {
  if (!text) return '';
  
  // Split into lines
  const lines = text.split('\n');
  const htmlLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return '';
    
    // Check for headers (# Header)
    if (trimmedLine.startsWith('# ')) {
      return `<h1 class="text-2xl font-bold mb-4">${trimmedLine.substring(2)}</h1>`;
    }
    if (trimmedLine.startsWith('## ')) {
      return `<h2 class="text-xl font-bold mb-3">${trimmedLine.substring(3)}</h2>`;
    }
    if (trimmedLine.startsWith('### ')) {
      return `<h3 class="text-lg font-bold mb-2">${trimmedLine.substring(4)}</h3>`;
    }
    
    // Check for bullet points (• or -)
    if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
      return `<li class="mb-1">${trimmedLine.substring(2)}</li>`;
    }
    
    // Check for numbered lists (1. 2. etc.)
    if (/^\d+\.\s/.test(trimmedLine)) {
      return `<li class="mb-1">${trimmedLine.replace(/^\d+\.\s/, '')}</li>`;
    }
    
    // Check for bold text (**text**)
    let processedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Check for italic text (*text*)
    processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Preserve placeholders (like {clientName}) - don't process them as formatting
    // This ensures they can be replaced later
    // Note: We keep the original {clientName} format for consistency with other processing functions
    
    // Regular paragraph
    return `<p class="mb-4">${processedLine}</p>`;
  });
  
  // Group consecutive list items
  const result = [];
  let inList = false;
  let listItems = [];
  
  for (const line of htmlLines) {
    if (line.startsWith('<li')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line);
    } else {
      if (inList) {
        // Close the list
        result.push('<ul class="list-disc list-inside mb-4">');
        result.push(...listItems);
        result.push('</ul>');
        inList = false;
        listItems = [];
      }
      if (line) {
        result.push(line);
      }
    }
  }
  
  // Close any remaining list
  if (inList) {
    result.push('<ul class="list-disc list-inside mb-4">');
    result.push(...listItems);
    result.push('</ul>');
  }
  
  return result.join('\n');
} 