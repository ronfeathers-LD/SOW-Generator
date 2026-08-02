'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
import SOWSectionContent from '@/components/sow/SOWSectionContent';
import CustomizedContentNotice from '@/components/sow/CustomizedContentNotice';
import { DetailedSkeleton } from '@/components/ui/LoadingSkeletons';

interface SOWObjectivesDisclosurePageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWObjectivesDisclosurePage({ 
  customContent, 
  isEdited = false 
}: SOWObjectivesDisclosurePageProps) {
  const { content, loading } = useSOWContent({
    sectionName: 'objectives-disclosure',
    customContent
  });

  if (loading) {
    return <DetailedSkeleton />;
  }

  return (
    <div className="max-w-none text-left">
      {isEdited && <CustomizedContentNotice />}

      <SOWSectionContent
        sectionKey="objectives_disclosure"
        id="sow-content-objectives-disclosure"
        className="text-base leading-relaxed sow-content"
        html={content}
      />
    </div>
  );
} 