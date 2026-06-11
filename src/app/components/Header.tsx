// Server component: reads the deploy environment at render time.
// Detection logic lives in src/lib/deploy-env.ts (single source of truth);
// local dev matches neither env var and renders the default
// (production-style) strip.

import { isStagingDeploy } from '@/lib/deploy-env';

export default function Header() {
  const isStage = isStagingDeploy();

  return (
    <div
      className={`border-b print-sow-hide ${
        isStage ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-2.5">
          <span
            className={`text-sm font-bold tracking-widest uppercase ${
              isStage ? 'text-amber-900' : 'text-gray-900'
            }`}
          >
            SOW Generator
          </span>
          <span
            className={`mx-3 font-light ${
              isStage ? 'text-amber-300' : 'text-gray-300'
            }`}
          >
            ·
          </span>
          <span
            className={`text-sm tracking-widest uppercase ${
              isStage
                ? 'text-amber-600 font-bold'
                : 'text-gray-400 font-medium'
            }`}
          >
            {isStage ? 'Stage' : 'Internal Tool'}
          </span>
        </div>
      </div>
    </div>
  );
}
