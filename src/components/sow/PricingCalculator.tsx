'use client';


import { SOWData } from '@/types/sow';
import { sortProducts } from '@/lib/utils/productSorting';

interface PricingCalculatorProps {
  formData: SOWData; // Use proper SOWData type
}

export default function PricingCalculator({ 
  formData, 
}: PricingCalculatorProps) {

  // Calculate hours for each product based on the same logic used in auto-calculate
  const calculateProductHours = (product: string): number => {
    let hours = 0;
    
    if (product === 'Lead to Account Matching') {
      // Only count if it's the only product
      if (formData.template?.products?.length === 1) {
        hours = 15;
      }
    } else if (['Lead Routing', 'Contact Routing', 'Account Routing', 'Opportunity Routing', 'Case Routing'].includes(product)) {
      // Routing products: first = 15 hours, additional = 5 hours each
      const routingProducts = formData.template?.products?.filter(p => 
        ['Lead Routing', 'Contact Routing', 'Account Routing', 'Opportunity Routing', 'Case Routing'].includes(p)
      ) || [];
      const routingIndex = routingProducts.indexOf(product);
      if (routingIndex === 0) {
        hours = 15; // First routing product
      } else {
        hours = 5; // Additional routing products
      }
    } else if (product === 'BookIt for Forms') {
      hours = 10; // Base BookIt for Forms hours
    } else if (product === 'BookIt Handoff (with Smartrep)') {
      // Only add hours if BookIt for Forms is also selected
      if (formData.template?.products?.includes('BookIt for Forms')) {
        hours = 5;
      }
    } else if (['BookIt Links', 'BookIt Handoff (without Smartrep)'].includes(product)) {
      hours = 1; // No-cost items, but count hours
    }
    
    return hours;
  };



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
