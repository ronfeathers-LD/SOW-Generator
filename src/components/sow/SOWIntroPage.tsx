'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
import { ContentSkeleton } from '@/components/ui/LoadingSkeletons';
import { processContent } from '@/lib/text-to-html';

interface SOWIntroPageProps {
  clientName: string;
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWIntroPage({ clientName, customContent, isEdited }: SOWIntroPageProps) {
  // Custom processor for intro content that handles client name replacement
  const introProcessor = (content: string) => {
    let processedContent = processContent(content);
    if (clientName) {
      processedContent = processedContent.replace(/{clientName}/g, `<span class="font-bold">${clientName}</span>`);
    } else {
      processedContent = processedContent.replace(/{clientName}/g, '<span class="font-bold">[Client Name]</span>');
    }
    return processedContent;
  };

  const { content, loading } = useSOWContent({
    sectionName: 'intro',
    customContent,
    processor: introProcessor,
    dependencies: [clientName]
  });

  if (loading) {
    return <ContentSkeleton />;
  }

  return (
    <div className="max-w-none text-left">
      {isEdited ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ <strong>Note:</strong> This content has been customized from the default template.
            </p>
          </div>
          
          <div 
            id="sow-content-intro"
            className="text-base leading-relaxed sow-content"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>
      ) : (
        <div 
          id="sow-content-intro"
          className="text-base leading-relaxed sow-content"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      )}
    </div>
  );
} 