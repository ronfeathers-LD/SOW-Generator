'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
import SOWSectionContent from '@/components/sow/SOWSectionContent';
import CustomizedContentNotice from '@/components/sow/CustomizedContentNotice';
import { DetailedSkeleton } from '@/components/ui/LoadingSkeletons';

interface SOWAssumptionsPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWAssumptionsPage({ 
  customContent, 
  isEdited = false 
}: SOWAssumptionsPageProps) {
  const { content, loading } = useSOWContent({
    sectionName: 'assumptions',
    customContent
  });

  if (loading) {
    return <DetailedSkeleton />;
  }

  return (
    <div className="max-w-none text-left">
      {isEdited && <CustomizedContentNotice />}
      <SOWSectionContent
        sectionKey="assumptions"
        id="sow-content-assumptions"
        className="text-base leading-relaxed sow-content"
        html={content}
      />
    </div>
  );
} 