'use client';

import { ContentSkeleton } from '@/components/ui/LoadingSkeletons';

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
  return (
    <div className="max-w-none text-left">
      {/* Scope Content from Database */}
      {isEdited ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ <strong>Note:</strong> This content has been customized from the default template.
            </p>
          </div>
          
          <div className="text-base leading-relaxed">
            {customContent ? (
              <div dangerouslySetInnerHTML={{ __html: customContent }} />
            ) : (
              <p className="text-gray-600 italic">No custom scope content found</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Scope Content from Database</h4>
          <div className="text-base leading-relaxed">
            {customContent ? (
              <div dangerouslySetInnerHTML={{ __html: customContent }} />
            ) : (
              <p className="text-gray-600 italic">No custom scope content found</p>
            )}
          </div>
        </div>
      )}
      
      {/* Deliverables from Database */}
      <div className="mb-6 p-4 border-2 border-green-300 rounded-lg bg-green-50">
        <h4 className="text-sm font-semibold text-green-800 mb-2">Deliverables from Database</h4>
        <div className="text-base leading-relaxed">
          {customDeliverablesContent ? (
            <div dangerouslySetInnerHTML={{ __html: customDeliverablesContent }} />
          ) : (
            <p className="text-gray-600 italic">No custom deliverables content found</p>
          )}
        </div>
      </div>
      
      {/* Debug Info */}
      <div className="mt-4 p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
        <h4 className="text-sm font-semibold text-purple-800 mb-2">DEBUG: Content Sources</h4>
        <div className="text-xs text-purple-700 space-y-1">
          <div><strong>customDeliverablesContent:</strong> {customDeliverablesContent ? 'Present' : 'None'}</div>
          <div><strong>customContent:</strong> {customContent ? 'Present' : 'None'}</div>
          <div><strong>deliverables count:</strong> {deliverables.length}</div>
          <div><strong>isEdited:</strong> {isEdited ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
} 