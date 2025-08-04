import React, { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';

interface Product {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

interface ProjectOverviewTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function ProjectOverviewTab({
  formData,
  setFormData,
}: ProjectOverviewTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const selectedProducts = formData.template?.products || [];
  
  const handleProductToggle = (productName: string) => {
    const currentProducts = formData.template?.products || [];
    const newProducts = currentProducts.includes(productName)
      ? currentProducts.filter(p => p !== productName)
      : [...currentProducts, productName];
    
    setFormData({
      ...formData,
      template: { ...formData.template!, products: newProducts }
    });
  };

  const isProductSelected = (productName: string) => {
    return selectedProducts.includes(productName);
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Project Overview</h2>
      
      {/* SOW Title and Project Timeline - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOW Title */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">SOW Title</h3>
          <input
            type="text"
            value={formData.template?.sow_title || formData.header?.sow_title || ''}
            onChange={(e) => setFormData({
              ...formData,
              template: { ...formData.template!, sow_title: e.target.value },
              header: { ...formData.header!, sow_title: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter SOW title"
          />
        </div>

        {/* Project Timeline */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.scope?.timeline?.start_date ? new Date(formData.scope.timeline.start_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({
                  ...formData,
                  scope: { 
                    ...formData.scope!, 
                    timeline: {
                      ...formData.scope?.timeline!,
                      start_date: new Date(e.target.value)
                    } 
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <input
                type="text"
                value={formData.scope?.timeline?.duration || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  scope: { 
                    ...formData.scope!, 
                    timeline: { 
                      ...formData.scope?.timeline!, 
                      duration: e.target.value 
                    } 
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., 8 weeks, 3 months"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products
                {selectedProducts.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {selectedProducts.length} selected
                  </span>
                )}
              </label>
              
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading products...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {products.map((product) => {
                        const isSelected = isProductSelected(product.name);
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleProductToggle(product.name)}
                            className={`
                              relative p-3 border rounded-lg cursor-pointer transition-all duration-150 hover:shadow-sm
                              ${isSelected 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                              }
                            `}
                          >
                            {/* Selection Indicator */}
                            <div className={`
                              absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center
                              ${isSelected 
                                ? 'border-indigo-500 bg-indigo-500' 
                                : 'border-gray-300 bg-white'
                              }
                            `}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>

                            {/* Product Content */}
                            <div className="pr-6">
                              <h4 className={`
                                font-medium text-xs leading-tight
                                ${isSelected ? 'text-indigo-900' : 'text-gray-900'}
                              `}>
                                {product.name}
                              </h4>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Products Summary */}
              {selectedProducts.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Products:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((productName) => (
                      <span
                        key={productName}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {productName}
                        <button
                          onClick={() => handleProductToggle(productName)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600 focus:outline-none"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Units</label>
            <input
              type="text"
              value={formData.template?.number_of_units || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, number_of_units: e.target.value || null }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter number of units"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Regions/Business Units</label>
            <input
              type="text"
              value={formData.template?.regions || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, regions: e.target.value || null }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter regions/business units"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Salesforce Tenants</label>
            <input
              type="text"
              value={formData.template?.salesforce_tenants || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, salesforce_tenants: e.target.value || null }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter number of Salesforce tenants"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timeline (Weeks)</label>
            <input
              type="text"
              value={formData.template?.timeline_weeks || ''}
              onChange={(e) => {
                const weeks = e.target.value;
                setFormData({
                  ...formData,
                  template: { ...formData.template!, timeline_weeks: weeks }
                });
                
                // Calculate end date if start date exists
                if (formData.template?.start_date && weeks) {
                  const startDate = new Date(formData.template.start_date);
                  const endDate = new Date(startDate);
                  endDate.setDate(startDate.getDate() + (parseInt(weeks) * 7));
                  setFormData({
                    ...formData,
                    template: { 
                      ...formData.template!, 
                      timeline_weeks: weeks,
                      end_date: endDate
                    }
                  });
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={formData.template?.start_date ? new Date(formData.template.start_date).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const startDate = new Date(e.target.value);
                setFormData({
                  ...formData,
                  template: { ...formData.template!, start_date: startDate }
                });
                
                // Calculate end date if timeline weeks exists
                if (formData.template?.timeline_weeks) {
                  const endDate = new Date(startDate);
                  endDate.setDate(startDate.getDate() + (parseInt(formData.template.timeline_weeks) * 7));
                  setFormData({
                    ...formData,
                    template: { 
                      ...formData.template!, 
                      start_date: startDate,
                      end_date: endDate
                    }
                  });
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date (Calculated)</label>
            <input
              type="date"
              value={formData.template?.end_date ? new Date(formData.template.end_date).toISOString().split('T')[0] : ''}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Units Consumption</label>
            <select
              value={formData.template?.units_consumption || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, units_consumption: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select consumption pattern</option>
              <option value="All units immediately">All units immediately</option>
              <option value="Gradual consumption over timeline">Gradual consumption over timeline</option>
              <option value="Custom consumption pattern">Custom consumption pattern</option>
            </select>
          </div>
        </div>
      </div>


    </section>
  );
} 