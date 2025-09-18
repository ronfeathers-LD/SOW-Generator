

interface PricingRole {
  role: string;
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
}

export default function PricingDisplay({
  pricingRoles,
  discountType,
  discountAmount,
  discountPercentage,
  subtotal,
  totalAmount,
  lastCalculated,
  pmHoursRemoved = false
}: PricingDisplayProps) {
  // Filter out Project Manager role if PM hours are removed
  const filteredPricingRoles = pmHoursRemoved 
    ? pricingRoles.filter(role => role.role !== 'Project Manager')
    : pricingRoles;

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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg overflow-hidden">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {hasAnyDiscount ? 'Standard Rate/Hr' : 'Rate/Hr'}
                </th>
                {hasAnyDiscount && (
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Discounted Rate/Hr
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPricingRoles && filteredPricingRoles.length > 0 ? (
                filteredPricingRoles.map((role, idx) => {
                  const hasDiscount = role.defaultRate && role.defaultRate !== role.ratePerHour;
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{role.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {hasDiscount ? (
                          <span className="line-through text-gray-500">${role.defaultRate?.toFixed(2) || '0.00'}</span>
                        ) : (
                          `$${role.ratePerHour?.toFixed(2) || '0.00'}`
                        )}
                      </td>
                      {hasAnyDiscount && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {hasDiscount ? (
                            <span className="text-green-600 font-semibold">${role.ratePerHour?.toFixed(2) || '0.00'}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{role.totalHours}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        ${role.totalCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={hasAnyDiscount ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
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
