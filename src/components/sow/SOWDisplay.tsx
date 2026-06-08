'use client';

import Link from 'next/link';
import SOWPrintView from '@/components/sow/SOWPrintView';
import SOWFullView from '@/components/sow/SOWFullView';
import { useSow } from '@/components/sow/hooks/useSow';

export type SOWDisplayMode = 'full' | 'print';

interface SOWDisplayProps {
  mode: SOWDisplayMode;
  sowId: string;
  showActions?: boolean;
  showComments?: boolean;
  showPricing?: boolean;
  showApproval?: boolean;
  showVersionHistory?: boolean;
  showGoogleDrive?: boolean;
  className?: string;
}

/**
 * Read-only SOW view. Loads the SOW via `useSow`, handles the shared
 * loading / error / not-found states, then delegates rendering to the
 * mode-specific view: `SOWPrintView` (print / PDF source) or `SOWFullView`
 * (the interactive /sow/[id] page). The #68 split reduced this from a
 * ~1,990-line god component to this orchestrator.
 */
export default function SOWDisplay({
  mode,
  sowId,
  showActions = true,
  showComments = true,
  showPricing = true,
  showApproval = true,
  showVersionHistory = true,
  showGoogleDrive = true,
  className = ""
}: SOWDisplayProps) {
  const { sow, salesforceData, products, loading, error } = useSow(sowId);

  // Loading and error states
  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading SOW...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Error Loading SOW</h3>
          <p className="mt-2 text-red-700">{error}</p>
          <div className="mt-4">
            <Link
              href="/sow"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              Back to SOWs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800">SOW Not Found</h3>
          <p className="mt-2 text-yellow-700">The requested SOW could not be found.</p>
          <div className="mt-4">
            <Link
              href="/sow"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
            >
              Back to SOWs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render based on mode
  if (mode === 'print') {
    return (
      <SOWPrintView
        sow={sow}
        salesforceData={salesforceData}
        products={products}
        showPricing={showPricing}
        className={className}
      />
    );
  }

  return (
    <SOWFullView
      sow={sow}
      salesforceData={salesforceData}
      products={products}
      sowId={sowId}
      showActions={showActions}
      showComments={showComments}
      showPricing={showPricing}
      showApproval={showApproval}
      showVersionHistory={showVersionHistory}
      showGoogleDrive={showGoogleDrive}
      className={className}
    />
  );
}
