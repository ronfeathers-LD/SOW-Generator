import SOWSectionContent from '@/components/sow/SOWSectionContent';
import CustomizedContentNotice from '@/components/sow/CustomizedContentNotice';
import { stripTableInlineStyles } from '@/lib/sow-content';

interface SOWProjectPhasesPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWProjectPhasesPage({ customContent, isEdited }: SOWProjectPhasesPageProps) {
  const cleanedContent = stripTableInlineStyles(customContent || '');

  return (
    <div className="max-w-none text-left">
      {isEdited && <CustomizedContentNotice />}
      {/* Project Phases Content */}
      <SOWSectionContent
        sectionKey="project_phases"
        id="sow-content-project-phases"
        className="text-base leading-relaxed sow-content"
        html={cleanedContent}
      />
    </div>
  );
} 