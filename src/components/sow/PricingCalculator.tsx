'use client';

import React from 'react';



interface PricingCalculatorProps {
  formData: any; // Only formData is used
}

export default function PricingCalculator({ 
  formData, 
}: PricingCalculatorProps) {

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
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">{product}</span>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            Units: {unitValue} {unitValue === '1' ? 'user/endpoint' : 'users/endpoints'}
                          </span>
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
