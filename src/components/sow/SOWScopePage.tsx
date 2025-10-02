'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';

interface SOWScopePageProps {
  customContent?: string;
  customDeliverablesContent?: string;
  isEdited?: boolean;
}

export default function SOWScopePage({ 
  customContent, 
  customDeliverablesContent,
  isEdited 
}: SOWScopePageProps) {
  const { content, loading } = useSOWContent({
    sectionName: 'scope',
    customContent,
  });

  if (loading) {
    return (
      <div className="max-w-none text-left">
        <div className="animate-pulse">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
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
          
          <div id="sow-content-scope" className="text-base leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      ) : (
        <div id="sow-content-scope" className="text-base leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )}
      
      {/* Deliverables Content */}
      {customDeliverablesContent && (
        <div id="sow-content-deliverables" className="mt-6 text-base leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: customDeliverablesContent }} />
        </div>
      )}
    </div>
  );
} 