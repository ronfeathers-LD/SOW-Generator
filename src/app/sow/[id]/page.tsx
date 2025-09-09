'use client';

import { useParams } from 'next/navigation';
import SOWDisplay from '@/components/sow/SOWDisplay';

export default function SOWDetailsPage() {
  const params = useParams();

  return (
    <SOWDisplay 
      mode="full" 
      sowId={params.id as string}
      showActions={true}
      showComments={true}
      showPricing={true}
      showApproval={true}
      showVersionHistory={true}
      showGoogleDrive={true}
    />
  );
}
