

interface TimelineDisplayProps {
  timelineWeeks: string;
  className?: string;
}

export default function TimelineDisplay({ timelineWeeks, className = '' }: TimelineDisplayProps) {
  // Parse the timeline weeks to determine phase durations
  const totalWeeks = parseFloat(timelineWeeks) || 0;
  
  // Helper function to format duration with appropriate units
  const formatDuration = (weeks: number) => {
    if (weeks < 1) {
      // Convert to days and round up to nearest day
      const days = Math.ceil(weeks * 7);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } else {
      // Round to 1 decimal place for weeks
      const roundedWeeks = Math.round(weeks * 10) / 10;
      return `${roundedWeeks} ${roundedWeeks === 1 ? 'week' : 'weeks'}`;
    }
  };

  // Helper function to format total duration display
  const formatTotalDuration = (weeks: number) => {
    if (weeks < 1) {
      const days = Math.ceil(weeks * 7);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } else {
      return `${weeks} weeks`;
    }
  };
  
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
      duration: totalWeeks * phaseDurations.engage
    },
    {
      name: 'DISCOVERY', 
      description: 'Requirements gathering and analysis',
      duration: totalWeeks * phaseDurations.discovery
    },
    {
      name: 'BUILD',
      description: 'Solution development and configuration',
      duration: totalWeeks * phaseDurations.build
    },
    {
      name: 'TEST',
      description: 'Quality assurance and validation',
      duration: totalWeeks * phaseDurations.test
    },
    {
      name: 'DEPLOY',
      description: 'Production deployment and go-live',
      duration: totalWeeks * phaseDurations.deploy
    },
    {
      name: 'HYPERCARE',
      description: 'Post-deployment support and transition',
      duration: totalWeeks * phaseDurations.hypercare
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
        <div className="text-sm text-gray-600">
          Total Duration: <span className="font-medium">{formatTotalDuration(totalWeeks)}</span>
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
                  {formatDuration(phase.duration)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Timeline breakdown based on {formatTotalDuration(totalWeeks)} project duration
      </div>
    </div>
  );
}
