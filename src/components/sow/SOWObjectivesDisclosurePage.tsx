'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';
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
      {isEdited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This content has been customized from the default template.
          </p>
        </div>
      )}
      
      <div 
        className="text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
} 