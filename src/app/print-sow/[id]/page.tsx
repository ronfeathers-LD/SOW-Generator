'use client';

import { useParams } from 'next/navigation';
import SOWDisplay from '@/components/sow/SOWDisplay';

export default function PrintSOWPage() {
  const params = useParams();

  return (
    <SOWDisplay 
      mode="print" 
      sowId={params.id as string}
      showActions={false}
      showComments={false}
      showPricing={true}
      showApproval={false}
      showVersionHistory={false}
      showGoogleDrive={false}
      className="print-layout"
    />
  );
}
