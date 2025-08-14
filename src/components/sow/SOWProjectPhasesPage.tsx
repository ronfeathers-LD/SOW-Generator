interface SOWProjectPhasesPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWProjectPhasesPage({ customContent, isEdited }: SOWProjectPhasesPageProps) {

  return (
    <div className="max-w-none text-left">
      {isEdited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This content has been customized from the default template.
          </p>
        </div>
      )}

      {/* Project Phases Content */}
      <div 
        className="text-base leading-relaxed sow-content"
        dangerouslySetInnerHTML={{ __html: customContent || '' }}
      />
    </div>
  );
} 