'use client';

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
            {customContent ? (
              <div dangerouslySetInnerHTML={{ __html: customContent }} />
            ) : (
              <p className="text-gray-600 italic">No custom scope content found</p>
            )}
          </div>
        </div>
      ) : (
        <div id="sow-content-scope" className="text-base leading-relaxed">
          {customContent ? (
            <div dangerouslySetInnerHTML={{ __html: customContent }} />
          ) : (
            <p className="text-gray-600 italic">No custom scope content found</p>
          )}
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