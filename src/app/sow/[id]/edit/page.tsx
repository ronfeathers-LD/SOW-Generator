'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SOWForm from '@/components/SOWForm';
import { SOWData } from '@/types/sow';
import { mapApiResponseToSOWData } from '@/lib/sow/map-api-response';

export default function EditSOWPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [sow, setSOW] = useState<SOWData | null>(null);
  const [sowStatus, setSOWStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === 'admin';
  const pricingOnly = searchParams?.get('tab') === 'pricing';

  useEffect(() => {
    const fetchSOW = async () => {
      try {
        const response = await fetch(`/api/sow/${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Check if SOW is editable
          const status = data.status;
          setSOWStatus(status);
          
          // Allow admins to edit pricing on approved SOWs
          if ((status === 'approved' || status === 'rejected') && !(isAdmin && pricingOnly)) {
            // Redirect to view page with error message
            router.push(`/sow/${params.id}?error=immutable`);
            return;
          }
          
          // Transform the canonical API response into the form's SOWData shape
          // via the shared client mapper (src/lib/sow/map-api-response.ts).
          const transformedData: SOWData = mapApiResponseToSOWData(data);

          setSOW(transformedData);
        } else {
          console.error('Failed to fetch SOW:', response.statusText);
          router.push('/sow?error=not-found');
        }
      } catch (error) {
        console.error('Error fetching SOW:', error);
        router.push('/sow?error=fetch-failed');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [params.id, router, isAdmin, pricingOnly]);

  // Update document title when SOW is loaded
  useEffect(() => {
    if (sow) {
      const clientName = sow.header?.client_name || sow.template?.client_name || '';
      const title = sow.header?.sow_title || sow.template?.sow_title || 'Untitled SOW';
      document.title = clientName ? `${clientName} - ${title}` : title;
    } else if (!loading) {
      // Reset to default when SOW is not available
      document.title = 'Edit SOW';
    }
  }, [sow, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SOW...</p>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">SOW not found</p>
        </div>
      </div>
    );
  }

  // Determine if we're in pricing-only mode (admin editing approved SOW)
  const isPricingOnlyMode = pricingOnly && isAdmin && sowStatus === 'approved';
  
  return <SOWForm initialData={sow} pricingOnly={isPricingOnlyMode} />;
} 