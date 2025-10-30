'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PricingRole {
  role: string;
  description?: string;
  ratePerHour: number;
  defaultRate?: number;
  totalHours: number;
  totalCost: number;
}

interface PricingDisplayProps {
  pricingRoles: PricingRole[];
  discountType: 'none' | 'fixed' | 'percentage';
  discountAmount: number;
  discountPercentage: number;
  subtotal: number;
  totalAmount: number;
  lastCalculated?: string | null;
  pmHoursRemoved?: boolean; // New prop to indicate if PM hours are removed
  isPrintMode?: boolean; // New prop to indicate if in print mode
}

export default function PricingDisplay({
  pricingRoles,
  discountType,
  discountAmount,
  discountPercentage,
  subtotal,
  totalAmount,
  lastCalculated,
  pmHoursRemoved = false,
  isPrintMode = false
}: PricingDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Calculate tooltip position when it should be shown
  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
    }
  }, [showTooltip]);
  
  // Filter out Project Manager role if PM hours are removed, and always filter out Account Executive
  const filteredPricingRoles = pricingRoles.filter(role => {
    // Always exclude Account Executive from pricing roles table
    if (role.role === 'Account Executive') {
      return false;
    }
    // Exclude Project Manager if PM hours are removed
    if (pmHoursRemoved && role.role === 'Project Manager') {
      return false;
    }
    return true;
  });

  // Check if any role has a discount (different defaultRate and ratePerHour)
  const hasAnyDiscount = filteredPricingRoles.some(role => 
    role.defaultRate && role.defaultRate !== role.ratePerHour
  );
  return (
    <div className="space-y-6">
      {/* Pricing Roles Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Roles</h3>
        </div>

        <div className="overflow-x-auto formatSOWTable" style={{ overflowY: 'visible' }}>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>{hasAnyDiscount ? 'Standard Rate/Hr' : 'Rate/Hr'}</th>
                {hasAnyDiscount && (
                  <th>Discounted Rate/Hr</th>
                )}
                <th>Total Hours</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {/* Always show aggregated pricing in a single row */}
              {filteredPricingRoles && filteredPricingRoles.length > 0 ? (
                <tr>
                  <td className="text-center align-middle" style={{verticalAlign: 'middle', height: '80px', display: 'table-cell', whiteSpace: 'nowrap'}}>
                    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
                      {filteredPricingRoles.map((role, idx) => (
                        <div key={idx} style={{whiteSpace: 'nowrap'}}>{role.role}</div>
                      ))}
                    </div>
                  </td>
                  <td className="text-center align-middle" style={{verticalAlign: 'middle', height: '80px', display: 'table-cell'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                      {(() => {
                        // Group roles by their rates to avoid duplication
                        const rateGroups = filteredPricingRoles.reduce((groups, role) => {
                          const hasDiscount = Boolean(role.defaultRate && role.defaultRate !== role.ratePerHour);
                          const rateKey = hasDiscount ? `${role.defaultRate}-${role.ratePerHour}` : `${role.ratePerHour}`;
                          
                          if (!groups[rateKey]) {
                            groups[rateKey] = {
                              roles: [],
                              hasDiscount,
                              defaultRate: role.defaultRate,
                              ratePerHour: role.ratePerHour
                            };
                          }
                          groups[rateKey].roles.push(role.role);
                          return groups;
                        }, {} as Record<string, { roles: string[], hasDiscount: boolean, defaultRate?: number, ratePerHour: number }>);

                        return Object.values(rateGroups).map((group, groupIdx) => (
                          <div key={groupIdx}>
                            {group.hasDiscount ? (
                              <span className="line-through text-gray-500">${group.defaultRate?.toFixed(2) || '0.00'}</span>
                            ) : (
                              `$${group.ratePerHour?.toFixed(2) || '0.00'}`
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </td>
                  {hasAnyDiscount && (
                    <td className="text-center align-middle" style={{verticalAlign: 'middle', height: '80px', display: 'table-cell'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                        {(() => {
                          // Group roles by their discounted rates to avoid duplication
                          const discountedRateGroups = filteredPricingRoles.reduce((groups, role) => {
                            const hasDiscount = Boolean(role.defaultRate && role.defaultRate !== role.ratePerHour);
                            const rateKey = hasDiscount ? `${role.defaultRate}-${role.ratePerHour}` : `${role.ratePerHour}`;
                            
                            if (!groups[rateKey]) {
                              groups[rateKey] = {
                                roles: [],
                                hasDiscount,
                                defaultRate: role.defaultRate,
                                ratePerHour: role.ratePerHour
                              };
                            }
                            groups[rateKey].roles.push(role.role);
                            return groups;
                          }, {} as Record<string, { roles: string[], hasDiscount: boolean, defaultRate?: number, ratePerHour: number }>);

                          return Object.values(discountedRateGroups).map((group, groupIdx) => (
                            <div key={groupIdx}>
                              {group.hasDiscount ? (
                                <span className="text-green-600 font-semibold">${group.ratePerHour?.toFixed(2) || '0.00'}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </td>
                  )}
                  <td className="text-center align-middle" style={{verticalAlign: 'middle', height: '80px', display: 'table-cell'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px'}}>
                      <span>{filteredPricingRoles.reduce((sum, role) => sum + (role.totalHours || 0), 0)}</span>
                      {!isPrintMode && filteredPricingRoles.length > 1 && (
                        <>
                          <button
                            ref={buttonRef}
                            type="button"
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            aria-label="Show hours breakdown"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {showTooltip && typeof document !== 'undefined' && createPortal(
                            <div 
                              className="fixed w-64 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-[9999]"
                              style={{ 
                                top: `${tooltipPosition.top}px`, 
                                left: `${tooltipPosition.left}px`,
                                transform: 'translateX(-50%)'
                              }}
                              onMouseEnter={() => setShowTooltip(true)}
                              onMouseLeave={() => setShowTooltip(false)}
                            >
                              <div className="p-3">
                                <div className="font-semibold mb-2 pb-2 border-b border-gray-700">Hours Breakdown</div>
                                {filteredPricingRoles.map((role, idx) => (
                                  <div key={idx} className="flex justify-between py-1">
                                    <span>{role.role}:</span>
                                    <span className="font-medium">{role.totalHours} hrs</span>
                                  </div>
                                ))}
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>,
                            document.body
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-center align-middle" style={{verticalAlign: 'middle', height: '80px', display: 'table-cell'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                      ${filteredPricingRoles.reduce((sum, role) => sum + (role.totalCost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={hasAnyDiscount ? 5 : 4} className="text-center text-gray-500">
                    No pricing roles defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Summary</h3>
        </div>
        {lastCalculated && (
          <p className="text-sm text-gray-600 mb-4">
            Last calculated: {new Date(lastCalculated).toLocaleString()}
          </p>
        )}
        <div className={`grid gap-4 ${discountType !== 'none' && discountAmount > 0 || (discountType === 'percentage' && discountPercentage > 0) ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="text-xl font-bold text-gray-900">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          {(discountType === 'fixed' && discountAmount && discountAmount > 0) || (discountType === 'percentage' && discountPercentage && discountPercentage > 0) ? (
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">Discount</div>
              <div className="text-xl font-bold text-red-600">
                {discountType === 'fixed' ? (
                  `-$${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  `-${discountPercentage}%`
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {discountType === 'fixed' 
                  ? `Fixed discount of $${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${discountPercentage}% discount applied to subtotal`
                }
              </div>
            </div>
          ) : null}
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-xl font-bold text-green-600">
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
