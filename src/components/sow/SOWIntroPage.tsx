'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
import SOWSectionContent from '@/components/sow/SOWSectionContent';
import CustomizedContentNotice from '@/components/sow/CustomizedContentNotice';
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
      {isEdited && <CustomizedContentNotice />}
      <SOWSectionContent
        sectionKey="intro"
        id="sow-content-intro"
        className="text-base leading-relaxed sow-content"
        html={content}
      />
    </div>
  );
} 