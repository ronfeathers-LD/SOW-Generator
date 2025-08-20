'use client';


import { SOWData } from '@/types/sow';

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
    } else if (['Lead Routing', 'Contact Routing', 'Account Routing'].includes(product)) {
      // Routing products: first = 15 hours, additional = 5 hours each
      const routingProducts = formData.template?.products?.filter(p => 
        ['Lead Routing', 'Contact Routing', 'Account Routing'].includes(p)
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

  // Calculate user group hours (every 50 users/units adds 5 hours)
  const calculateUserGroupHours = (): number => {
    const totalUnits = parseInt(formData.template?.number_of_units || '0') +
                      parseInt(formData.template?.bookit_forms_units || '0') +
                      parseInt(formData.template?.bookit_links_units || '0') +
                      parseInt(formData.template?.bookit_handoff_units || '0');
    
    if (totalUnits >= 50) {
      return Math.floor(totalUnits / 50) * 5;
    }
    return 0;
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
                  {formData.template.products.map((product: string, index: number) => {
                    let unitValue = '';
                    let isNoCost = false;
                    
                    if (product === 'Lead to Account Matching' || product === 'Lead Routing' || product === 'Contact Routing') {
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
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
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
            
            {/* Hours Summary */}
            {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-3">Hours Summary:</h4>
                <div className="space-y-2">
                  {/* Product Hours */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Product Hours:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formData.template.products.reduce((total, product) => total + calculateProductHours(product), 0)} hours
                    </span>
                  </div>
                  
                  {/* User Group Hours */}
                  {(() => {
                    const userGroupHours = calculateUserGroupHours();
                    return userGroupHours > 0 ? (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">User Group Hours:</span>
                        <span className="text-sm font-medium text-gray-900">{userGroupHours} hours</span>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Total Hours */}
                  <div className="border-t border-green-300 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-900">Total Project Hours:</span>
                      <span className="font-medium text-green-900">
                        {formData.template.products.reduce((total, product) => total + calculateProductHours(product), 0) + calculateUserGroupHours()} hours
                      </span>
                    </div>
                  </div>
                  
                  {/* PM Hours */}
                  <div className="text-xs text-green-700 mt-2">
                    💡 Project Manager hours are calculated as 25% of total project hours (minimum 10 hours)
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
