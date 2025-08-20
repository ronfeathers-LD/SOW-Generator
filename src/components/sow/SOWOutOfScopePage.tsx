'use client';

interface SOWOutOfScopePageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWOutOfScopePage({ 
  customContent, 
  isEdited 
}: SOWOutOfScopePageProps) {
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
            {customContent ? (
              <div dangerouslySetInnerHTML={{ __html: customContent }} />
            ) : (
              <p className="text-gray-600 italic">No custom out-of-scope content found</p>
            )}
          </div>
        </div>
      ) : (
        <div id="sow-content-out-of-scope" className="text-base leading-relaxed">
          {customContent ? (
            <div dangerouslySetInnerHTML={{ __html: customContent }} />
          ) : (
            <p className="text-gray-600 italic">No custom out-of-scope content found</p>
          )}
        </div>
      )}
    </div>
  );
}
