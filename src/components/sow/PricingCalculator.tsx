'use client';


import { SOWData } from '@/types/sow';
import { sortProducts } from '@/lib/utils/productSorting';
import { calculateProductHoursForProduct, calculateAccountSegmentHours } from '@/lib/hours-calculation-utils';

interface PricingCalculatorProps {
  formData: SOWData; // Use proper SOWData type
  selectedAccount?: { Account_Segment__c?: string } | null;
}

export default function PricingCalculator({ 
  formData, 
  selectedAccount,
}: PricingCalculatorProps) {

  // Calculate hours for each product using shared utility
  const calculateProductHours = (product: string): number => {
    return calculateProductHoursForProduct(product, formData.template?.products || []);
  };

  // Calculate account segment hours
  const accountSegmentHours = calculateAccountSegmentHours(selectedAccount?.Account_Segment__c);



  return (
    <div className="space-y-6">
      {/* Auto-Calculate Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3">Selected Products & Units:</h4>
              {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length > 0 ? (
                <div className="space-y-2">
                  {sortProducts(formData.template.products).map((product: string, index: number) => {
                    let unitValue = '';
                    let isNoCost = false;
                    
                    if (product === 'Lead to Account Matching' || product === 'Lead Routing' || product === 'Contact Routing' || product === 'Account Routing' || product === 'Opportunity Routing' || product === 'Case Routing') {
                      unitValue = formData.template?.number_of_units || formData.template?.units_consumption || '0';
                    } else if (product === 'BookIt for Forms') {
                      unitValue = formData.template?.bookit_forms_units || '0';
                    } else if (product === 'BookIt Links') {
                      unitValue = formData.template?.bookit_links_units || '0';
                      isNoCost = true;
                    } else if (product === 'BookIt Handoff (without Smartrep)') {
                    unitValue = formData.template?.bookit_links_units || '0';
                      isNoCost = true;
                    } else if (product === 'BookIt Handoff (with Smartrep)') {
                      unitValue = formData.template?.bookit_handoff_units || '0';
                    }
                    
                    const productHours = calculateProductHours(product);
                    
                    return (
                      <div key={`pricing-product-${index}-${product.slice(0, 15)}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">{product}</span>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            <div>Units: {unitValue} {unitValue === '1' ? 'user/endpoint' : 'users/endpoints'}</div>
                            {productHours > 0 && (
                              <div className="text-blue-600 font-medium">
                                Hours: {productHours} hr{productHours !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          {isNoCost && (
                            <div className="text-xs text-green-600 font-medium">No Cost</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">No products selected. Please go to the Project Overview tab to select products first.</p>
              )}
            </div>

            {/* Account Segment Hours */}
            {accountSegmentHours > 0 && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-3">Account Segment Hours:</h4>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">
                    MidMarket Account Segment
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      <div className="text-blue-600 font-medium">
                        Hours: {accountSegmentHours} hr{accountSegmentHours !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length === 0 && (
              <p className="text-sm text-blue-600 text-center">
                💡 Tip: Go to the Project Overview tab to select products and set units (users/endpoints)
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
