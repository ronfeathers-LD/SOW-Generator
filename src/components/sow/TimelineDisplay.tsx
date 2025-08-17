import React from 'react';

interface TimelineDisplayProps {
  timelineWeeks: string;
  className?: string;
}

export default function TimelineDisplay({ timelineWeeks, className = '' }: TimelineDisplayProps) {
  // Parse the timeline weeks to determine phase durations
  const totalWeeks = parseFloat(timelineWeeks) || 0;
  
  // Define phase duration ratios based on typical project breakdowns
  // These can be adjusted based on your business logic
  const phaseDurations = {
    engage: 0.125,      // 12.5% of total timeline
    discovery: 0.25,    // 25% of total timeline  
    build: 0.25,        // 25% of total timeline
    test: 0.125,        // 12.5% of total timeline
    deploy: 0.125,      // 12.5% of total timeline
    hypercare: 0.125    // 12.5% of total timeline
  };

  const phases = [
    {
      name: 'ENGAGE',
      description: 'Project kickoff and planning',
      duration: Math.round(totalWeeks * phaseDurations.engage * 10) / 10
    },
    {
      name: 'DISCOVERY', 
      description: 'Requirements gathering and analysis',
      duration: Math.round(totalWeeks * phaseDurations.discovery * 10) / 10
    },
    {
      name: 'BUILD',
      description: 'Solution development and configuration',
      duration: Math.round(totalWeeks * phaseDurations.build * 10) / 10
    },
    {
      name: 'TEST',
      description: 'Quality assurance and validation',
      duration: Math.round(totalWeeks * phaseDurations.test * 10) / 10
    },
    {
      name: 'DEPLOY',
      description: 'Production deployment and go-live',
      duration: Math.round(totalWeeks * phaseDurations.deploy * 10) / 10
    },
    {
      name: 'HYPERCARE',
      description: 'Post-deployment support and transition',
      duration: Math.round(totalWeeks * phaseDurations.hypercare * 10) / 10
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
        <div className="text-sm text-gray-600">
          Total Duration: <span className="font-medium">{totalWeeks} weeks</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
            <div>Phase</div>
            <div>Description</div>
            <div className="text-right">Duration</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {phases.map((phase, index) => (
            <div key={phase.name} className="px-4 py-3 hover:bg-gray-50">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="font-medium text-gray-900">
                  {index + 1}. {phase.name}
                </div>
                <div className="text-sm text-gray-600">
                  {phase.description}
                </div>
                <div className="text-right font-medium text-gray-900">
                  {phase.duration} {phase.duration === 1 ? 'week' : 'weeks'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Timeline breakdown based on {totalWeeks}-week project duration
      </div>
    </div>
  );
}
