'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
import { ContentSkeleton } from '@/components/ui/LoadingSkeletons';
import { processContent } from '@/lib/text-to-html';

interface SOWScopePageProps {
  deliverables: string[];
  projectDescription: string;
  customContent?: string;
  customDeliverablesContent?: string;
  isEdited?: boolean;
}

export default function SOWScopePage({ 
  deliverables, 
  projectDescription, 
  customContent, 
  customDeliverablesContent,
  isEdited 
}: SOWScopePageProps) {
  // Custom processor for scope content that handles deliverables replacement
  const scopeProcessor = (content: string) => {
    let processedContent = processContent(content);
    
    // Replace deliverables placeholder with actual deliverables
    const deliverablesHtml = deliverables
      .map((deliverable) => `<div class="mb-4"><div>${deliverable}</div></div>`)
      .join('\n');
    processedContent = processedContent.replace(/{deliverables}/g, deliverablesHtml);
    
    return processedContent;
  };

  // Determine which content to use and how to process it
  const contentToUse = customDeliverablesContent || customContent;
  const processor = customDeliverablesContent ? processContent : scopeProcessor;

  const { content, loading } = useSOWContent({
    sectionName: 'scope',
    customContent: contentToUse,
    processor,
    dependencies: [deliverables, customDeliverablesContent]
  });

  if (loading) {
    return <ContentSkeleton />;
  }

  // Debug logging to see what content is being rendered
  console.log('=== SOW SCOPE PAGE DEBUG ===');
  console.log('Content to render:', content);
  console.log('Content contains <ul>:', content.includes('<ul>'));
  console.log('Content contains <li>:', content.includes('<li>'));
  console.log('Content contains list-disc:', content.includes('list-disc'));
  console.log('=== END DEBUG ===');

  return (
    <div className="max-w-none text-left">
      {/* Project Description */}
      {projectDescription && (
        <div className="mb-6">
          <p className="text-gray-700">{projectDescription}</p>
        </div>
      )}
      
      {isEdited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This content has been customized from the default template.
          </p>
        </div>
      )}
      
      <div 
        className="text-base leading-relaxed sow-content"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
} 