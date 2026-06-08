'use client';

import { useEffect, useState } from 'react';
import { DisplaySOW, Product, SalesforceData } from '@/types/sow-display';
import { mapApiResponseToDisplaySOW } from '@/lib/sow/map-api-response-to-display';

export interface UseSowResult {
  sow: DisplaySOW | null;
  salesforceData: SalesforceData | null;
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads everything the read-only SOW view (`SOWDisplay`, print + full) renders
 * from: the SOW itself (mapped into the `DisplaySOW` view-model), the product
 * catalog, and — when the SOW is linked to a Salesforce account — its Salesforce
 * data. Also keeps `document.title` in sync with the loaded SOW.
 *
 * Extracted verbatim from `SOWDisplay` (#68 slice 2) so the component can be a
 * pure render of this state. Behavior-preserving.
 */
export function useSow(sowId: string): UseSowResult {
  const [sow, setSOW] = useState<DisplaySOW | null>(null);
  const [salesforceData, setSalesforceData] = useState<SalesforceData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data fetching logic (shared between modes)
  useEffect(() => {
    const fetchSOW = async () => {
      try {
        if (!sowId) {
          setError('SOW ID is required');
          setLoading(false);
          return;
        }

        // Fetch SOW and products in parallel
        const [response, productsResponse] = await Promise.all([
          fetch(`/api/sow/${sowId}`),
          fetch('/api/products'),
        ]);

        // Handle products result eagerly so it's ready by the time SOW renders
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData || []);
        } else {
          console.error('Error fetching products:', productsResponse.status);
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('SOW not found');
          }
          throw new Error(`Failed to fetch SOW: ${response.status}`);
        }
        const data = await response.json();

        // Map the API response into the display view-model (single seam).
        const parsedData = mapApiResponseToDisplaySOW(data);

        setSOW(parsedData);

        // Fetch Salesforce data if available
        if (parsedData.salesforceAccountId) {
          try {
            const salesforceResponse = await fetch(`/api/sow/${sowId}/salesforce-data`);
            if (salesforceResponse.ok) {
              const salesforceResult = await salesforceResponse.json();
              if (salesforceResult.success && salesforceResult.data) {
                setSalesforceData(salesforceResult.data);
              }
            }
          } catch (salesforceError) {
            console.warn('Failed to fetch Salesforce data:', salesforceError);
          }
        }

      } catch (err) {
        console.error('Error fetching SOW:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSOW();
  }, [sowId]);

  // Update document title when SOW is loaded
  useEffect(() => {
    if (sow) {
      const clientName = sow.clientName || '';
      const title = sow.sowTitle || 'Untitled SOW';
      document.title = clientName ? `${clientName} - ${title}` : title;
    } else if (!loading && !error) {
      // Reset to default when SOW is not available
      document.title = 'View SOW';
    }
  }, [sow, loading, error]);

  return { sow, salesforceData, products, loading, error };
}
