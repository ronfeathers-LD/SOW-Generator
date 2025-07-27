import React from 'react';
import { SOWData } from '@/types/sow';
import { GeminiBulletPoint } from '@/lib/gemini';
import AvomaIntegration from '../AvomaIntegration';

interface ObjectivesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function ObjectivesTab({
  formData,
  setFormData,
}: ObjectivesTabProps) {
  // Get customer name from form data
  const customerName = formData.template?.customerName || formData.header?.clientName || '';

  const handleBulletPointsGenerated = (bulletPoints: GeminiBulletPoint[]) => {
    // Convert bullet points to objectives
    const objectives = bulletPoints
      .filter(bp => bp.category === 'deliverable' || bp.category === 'requirement')
      .map(bp => `${bp.title}: ${bp.description}`)
      .slice(0, 10); // Limit to 10 objectives

    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        keyObjectives: objectives.length > 0 ? objectives : formData.objectives?.keyObjectives || [''] 
      }
    });
  };

  const handleProjectDescriptionGenerated = (description: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        description: description 
      }
    });
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Project Objectives</h2>
      
      {/* Avoma Integration */}
      {customerName && (
        <div className="bg-white shadow rounded-lg p-6">
          <AvomaIntegration
            onBulletPointsGenerated={handleBulletPointsGenerated}
            onProjectDescriptionGenerated={handleProjectDescriptionGenerated}
            customerName={customerName}
          />
        </div>
      )}

      {!customerName && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-700">
            Please complete the Customer Information tab first to enable Avoma scoping call lookup.
          </p>
        </div>
      )}
      
      {/* Project Objective Description */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Objective Description</h3>
        <textarea
          value={formData.objectives?.description || ''}
          onChange={(e) => setFormData({
            ...formData,
            objectives: { ...formData.objectives!, description: e.target.value }
          })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Describe the overall objective of this project..."
        />
      </div>

      {/* Key Objectives */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Key Objectives</h3>
        <p className="mt-1 text-sm text-gray-500 mb-3">
          List the specific objectives that will be achieved through this project
        </p>
        {formData.objectives?.keyObjectives?.map((objective, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 text-sm font-medium">{index + 1}</span>
            </div>
            <input
              type="text"
              value={objective}
              onChange={(e) => {
                const newObjectives = [...(formData.objectives?.keyObjectives || [])];
                newObjectives[index] = e.target.value;
                setFormData({
                  ...formData,
                  objectives: { ...formData.objectives!, keyObjectives: newObjectives }
                });
              }}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={`Objective ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => {
                const newObjectives = formData.objectives?.keyObjectives.filter((_, i) => i !== index) || [];
                setFormData({
                  ...formData,
                  objectives: { ...formData.objectives!, keyObjectives: newObjectives }
                });
              }}
              className="flex-shrink-0 p-1 text-red-600 hover:text-red-800"
              title="Remove objective"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newObjectives = [...(formData.objectives?.keyObjectives || []), ''];
            setFormData({
              ...formData,
              objectives: { ...formData.objectives!, keyObjectives: newObjectives }
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Objective
        </button>
      </div>
    </section>
  );
} 