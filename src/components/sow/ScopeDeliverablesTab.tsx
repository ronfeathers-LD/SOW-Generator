import React from 'react';
import { SOWData } from '@/types/sow';
import RichTextEditor from '../RichTextEditor';

interface ScopeDeliverablesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function ScopeDeliverablesTab({
  formData,
  setFormData,
}: ScopeDeliverablesTabProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Scope & Deliverables</h2>
      
      {/* Project Description */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Description</h3>
        <RichTextEditor
          value={formData.scope?.projectDescription || ''}
          onChange={(value) => setFormData({
            ...formData,
            scope: { ...formData.scope!, projectDescription: value }
          })}
          placeholder="Describe the project scope and deliverables..."
        />
      </div>

      {/* Deliverables */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Deliverables</h3>
        <RichTextEditor
          value={formData.scope?.deliverables || ''}
          onChange={(value) => setFormData({
            ...formData,
            scope: { ...formData.scope!, deliverables: value }
          })}
          placeholder="List the specific deliverables for this project..."
        />
      </div>

      {/* Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={formData.scope?.timeline?.startDate ? new Date(formData.scope.timeline.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({
                ...formData,
                scope: { 
                  ...formData.scope!, 
                  timeline: { 
                    ...formData.scope?.timeline!, 
                    startDate: new Date(e.target.value) 
                  } 
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration</label>
            <input
              type="text"
              value={formData.scope?.timeline?.duration || ''}
              onChange={(e) => setFormData({
                ...formData,
                scope: { 
                  ...formData.scope!, 
                  timeline: { 
                    ...formData.scope?.timeline!, 
                    duration: e.target.value 
                  } 
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., 8 weeks, 3 months"
            />
          </div>
        </div>
      </div>
    </section>
  );
} 