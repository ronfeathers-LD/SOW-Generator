import SOWSectionContent from '@/components/sow/SOWSectionContent';
import { stripTableInlineStyles } from '@/lib/sow-content';

interface SOWProjectPhasesPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWProjectPhasesPage({ customContent, isEdited }: SOWProjectPhasesPageProps) {
  const cleanedContent = stripTableInlineStyles(customContent || '');

  return (
    <div className="max-w-none text-left">
      {isEdited ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ <strong>Note:</strong> This content has been customized from the default template.
            </p>
          </div>
          
          {/* Project Phases Content */}
          <SOWSectionContent
            sectionKey="project_phases"
            id="sow-content-project-phases"
            className="text-base leading-relaxed sow-content"
            html={cleanedContent}
          />
        </div>
      ) : (
        /* Project Phases Content */
        <SOWSectionContent
          sectionKey="project_phases"
          id="sow-content-project-phases"
          className="text-base leading-relaxed sow-content"
          html={cleanedContent}
        />
      )}
    </div>
  );
} 