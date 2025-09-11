'use client';

import { useSOWContent } from '@/lib/hooks/useSOWContent';

interface SOWOutOfScopePageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWOutOfScopePage({ 
  customContent, 
  isEdited 
}: SOWOutOfScopePageProps) {
  const { content, loading } = useSOWContent({
    sectionName: 'out-of-scope',
    customContent,
  });

  if (loading) {
    return (
      <div className="max-w-none text-left">
        <div className="animate-pulse">
          <h2 className="text-2xl font-bold mb-6 mt-6 bg-gray-200 h-8 w-48 rounded"></h2>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
          
          <div id="sow-content-out-of-scope" className="text-base leading-relaxed">
            <h2 className="text-2xl font-bold mb-6 mt-6">OUT OF SCOPE</h2>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      ) : (
        <div id="sow-content-out-of-scope" className="text-base leading-relaxed">
          <h2 className="text-2xl font-bold mb-6 mt-6">OUT OF SCOPE</h2>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )}
    </div>
  );
}
