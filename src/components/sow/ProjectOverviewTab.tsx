import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Format the created date for display
  const formatCreatedDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Get the default title with created date
  const getDefaultTitle = (): string => {
    const customerName = formData.template?.client_name || '';
    const createdDate = formatCreatedDate(formData.created_at);
    
    if (customerName && createdDate) {
      return `Statement of Work for ${customerName} - ${createdDate}`;
    } else if (customerName) {
      return `Statement of Work for ${customerName}`;
    } else {
      return 'Statement of Work';
    }
  };

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

  // Run validation whenever form data or selected products change


  const selectedProducts = useMemo(() => formData.template?.products || [], [formData.template?.products]);
  
  const handleProductToggle = (productName: string) => {
    const currentProducts = formData.template?.products || [];
    const isCurrentlySelected = currentProducts.includes(productName);
    
    // Handle mutual exclusivity for BookIt Handoff variants
    let newProducts: string[];
    if (productName === 'BookIt Handoff (with Smartrep)' || productName === 'BookIt Handoff (without Smartrep)') {
      if (isCurrentlySelected) {
        // If deselecting, just remove the current one
        newProducts = currentProducts.filter(p => p !== productName);
      } else {
        // If selecting, remove the other variant and add the current one
        newProducts = currentProducts.filter(p => 
          p !== 'BookIt Handoff (with Smartrep)' && 
          p !== 'BookIt Handoff (without Smartrep)'
        );
        newProducts.push(productName);
      }
    } else {
      // Normal toggle behavior for other products
      newProducts = isCurrentlySelected
        ? currentProducts.filter(p => p !== productName)
        : [...currentProducts, productName];
    }
    
    // Prepare the updated template with new products
    const updatedTemplate = { ...formData.template!, products: newProducts };
    
    // Clear validation error and field value when product is deselected
    if (isCurrentlySelected) {
      const fieldName = getUnitFieldName(productName);
      if (fieldName) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        
        // Clear the field value when product is deselected
        if (fieldName === 'orchestration_units') {
          updatedTemplate.orchestration_units = '';
        } else if (fieldName === 'bookit_forms_units') {
          updatedTemplate.bookit_forms_units = '';
        } else if (fieldName === 'bookit_links_units') {
          updatedTemplate.bookit_links_units = '';
        } else if (fieldName === 'bookit_handoff_units') {
          updatedTemplate.bookit_handoff_units = '';
        }
      }
      
      // Special handling for routing products - clear number_of_units if no routing products remain
      if (productName.toLowerCase().includes('routing') || 
          productName.toLowerCase().includes('orchestration') ||
          productName.toLowerCase().includes('lead') ||
          productName.toLowerCase().includes('account')) {
        
        const remainingProducts = newProducts.filter(p => 
          p.toLowerCase().includes('routing') || 
          p.toLowerCase().includes('orchestration') ||
          p.toLowerCase().includes('lead') ||
          p.toLowerCase().includes('account')
        );
        
        if (remainingProducts.length === 0) {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.number_of_units;
            return newErrors;
          });
          
          updatedTemplate.number_of_units = '';
        }
      }
    }
    
    // Update form data once with all changes
    setFormData({
      ...formData,
      template: updatedTemplate
    });
  };

  const isProductSelected = (productName: string) => {
    return selectedProducts.includes(productName);
  };

  // Group products by category
  const groupProducts = (products: Product[]) => {
    const groups = {
      routing: {
        title: 'Routing & Orchestration',
        icon: '⚡',
        color: 'blue',
        products: products.filter(p => 
          p.name.toLowerCase().includes('routing') || 
          p.name.toLowerCase().includes('orchestration') ||
          p.name.toLowerCase().includes('lead') ||
          p.name.toLowerCase().includes('account') ||
          p.name.toLowerCase().includes('opportunity') ||
          p.name.toLowerCase().includes('case')
        )
      },
      bookit: {
        title: 'BookIt Family',
        icon: '📋',
        color: 'green',
        products: products.filter(p => 
          p.name.toLowerCase().includes('bookit')
        )
      },
      other: {
        title: 'Other Products',
        icon: '🔧',
        color: 'gray',
        products: products.filter(p => 
          !p.name.toLowerCase().includes('routing') && 
          !p.name.toLowerCase().includes('orchestration') &&
          !p.name.toLowerCase().includes('lead') &&
          !p.name.toLowerCase().includes('account') &&
          !p.name.toLowerCase().includes('opportunity') &&
          !p.name.toLowerCase().includes('case') &&
          !p.name.toLowerCase().includes('bookit')
        )
      }
    };

    // Only return groups that have products
              return Object.entries(groups).filter(([, group]) => group.products.length > 0);
  };

  // Helper function to get the corresponding unit field name for a product
  const getUnitFieldName = (productName: string): string | null => {
    const productToFieldMap: Record<string, string> = {
      'Orchestration': 'orchestration_units',
      'BookIt for Forms': 'bookit_forms_units',
      'BookIt Links': 'bookit_links_units',
      'BookIt Handoff': 'bookit_handoff_units',
      'BookIt Handoff (without Smartrep)': 'bookit_handoff_units',
      'BookIt Handoff (with Smartrep)': 'bookit_handoff_units'
    };
    return productToFieldMap[productName] || null;
  };

  // Helper function to check if any routing product is selected
  const isAnyRoutingProductSelected = useCallback((): boolean => {
    return selectedProducts.some(productName => 
      productName.toLowerCase().includes('routing') || 
      productName.toLowerCase().includes('orchestration') ||
      productName.toLowerCase().includes('lead') ||
      productName.toLowerCase().includes('account')
    );
  }, [selectedProducts]);

  // Validation function
  const validateUnitFields = useCallback(() => {
    const errors: Record<string, string> = {};
    
    // Helper function to check if a unit field is required
    const isUnitFieldRequired = (fieldName: string): boolean => {
      const fieldToProductMap: Record<string, string[]> = {
        'orchestration_units': ['Orchestration'],
        'bookit_forms_units': ['BookIt for Forms'],
        'bookit_links_units': ['BookIt Links'],
        'bookit_handoff_units': ['BookIt Handoff', 'BookIt Handoff (without Smartrep)', 'BookIt Handoff (with Smartrep)'],
        'number_of_units': [] // Will be handled separately for routing products
      };
      const productNames = fieldToProductMap[fieldName] || [];
      
      if (fieldName === 'number_of_units') {
        return isAnyRoutingProductSelected();
      }
      
      return productNames.some(productName => selectedProducts.includes(productName));
    };
    
    // Check each BookIt unit field
    const unitFields = ['orchestration_units', 'bookit_forms_units', 'bookit_links_units', 'bookit_handoff_units', 'number_of_units'];
    
    unitFields.forEach(fieldName => {
      if (isUnitFieldRequired(fieldName)) {
        const value = formData.template?.[fieldName as keyof typeof formData.template] as string;
        if (!value || value.trim() === '') {
          const fieldToProductMap: Record<string, string[]> = {
            'orchestration_units': ['Orchestration'],
            'bookit_forms_units': ['BookIt for Forms'],
            'bookit_links_units': ['BookIt Links'],
            'bookit_handoff_units': ['BookIt Handoff', 'BookIt Handoff (without Smartrep)', 'BookIt Handoff (with Smartrep)'],
            'number_of_units': ['Orchestration']
          };
          const productNames = fieldToProductMap[fieldName] || [];
          const matchingSelectedProducts = productNames.filter(productName => selectedProducts.includes(productName));
          
          if (fieldName === 'number_of_units') {
            errors[fieldName] = 'Number of Units: Orchestration is required when any routing product is selected';
          } else if (fieldName === 'bookit_handoff_units') {
            const productDisplayName = matchingSelectedProducts.length > 0 ? matchingSelectedProducts.join(' or ') : 'BookIt Handoff';
            errors[fieldName] = `BookIt Handoff Units is required when ${productDisplayName} is selected`;
          } else {
            const productName = productNames[0];
            errors[fieldName] = `${productName} Units is required when ${productName} is selected`;
          }
        }
      }
    });

    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    return isValid;
  }, [formData, selectedProducts, isAnyRoutingProductSelected]);

  // Run validation whenever form data or selected products change
  useEffect(() => {
    // Only run validation if form data is available
    if (formData.template && Object.keys(formData.template).length > 0) {
      validateUnitFields();
    }
  }, [validateUnitFields, formData.template]);

  // Handle unit field change with validation
  const handleUnitFieldChange = (fieldName: string, value: string) => {
    setFormData({
      ...formData,
      template: { ...formData.template!, [fieldName]: value }
    });

    // Clear validation error if field is now filled
    if (value.trim() !== '' && validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Project Overview</h2>
      
      {/* SOW Title */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">SOW Title</h3>
        <div className="max-w-2xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Statement of Work Title
            </span>
          </label>
          <input
            type="text"
            value={formData.template?.sow_title ?? getDefaultTitle()}
            onChange={(e) => setFormData({
              ...formData,
              template: { ...formData.template!, sow_title: e.target.value }
            })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={getDefaultTitle()}
          />
          <p className="mt-2 text-sm text-gray-500">
            Customize the title for this Statement of Work. The default format is &quot;Statement of Work for [Account Name] - [Created Date]&quot;.
          </p>
        </div>
      </div>
      
      {/* Project Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Regions/Business Units
              </span>
            </label>
            <input
              type="text"
              value={formData.template?.regions || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, regions: e.target.value || '' }
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter regions/business units"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Salesforce Tenants
              </span>
            </label>
            <input
              type="text"
              value={formData.template?.salesforce_tenants || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, salesforce_tenants: e.target.value || '' }
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter number of Salesforce tenants"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timeline (Weeks)
              </span>
            </label>
            <input
              type="text"
              value={formData.template?.timeline_weeks || ''}
              onChange={(e) => {
                const weeks = e.target.value;
                setFormData({
                  ...formData,
                  template: { ...formData.template!, timeline_weeks: weeks }
                });
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter timeline in weeks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Units Consumption
              </span>
            </label>
            <select
              value={formData.template?.units_consumption || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, units_consumption: e.target.value }
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select consumption pattern</option>
              <option value="All units immediately">All units immediately</option>
              <option value="Gradual consumption over timeline">Gradual consumption over timeline</option>
              <option value="Custom consumption pattern">Custom consumption pattern</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Products */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Products</h3>
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
                <div className="space-y-6">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products available.
                    </div>
                  ) : (
                    groupProducts(products).map(([groupKey, group]) => (
                      <div key={groupKey} className="space-y-3">
                        {/* Group Header */}
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{group.icon}</span>
                          <h4 className={`text-sm font-semibold ${
                            group.color === 'blue' ? 'text-blue-700' :
                            group.color === 'green' ? 'text-green-700' :
                            'text-gray-700'
                          }`}>
                            {group.title}
                          </h4>
                          <div className="flex-1 border-t border-gray-200"></div>
                        </div>
                        
                        {/* Group Products */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {group.products.map((product) => {
                            const isSelected = isProductSelected(product.name);
                            const colorClasses = {
                              blue: {
                                selected: 'border-blue-500 bg-blue-50',
                                unselected: 'border-gray-200 bg-white hover:border-blue-300',
                                indicator: 'border-blue-500 bg-blue-500',
                                text: 'text-blue-900'
                              },
                              green: {
                                selected: 'border-green-500 bg-green-50',
                                unselected: 'border-gray-200 bg-white hover:border-green-300',
                                indicator: 'border-green-500 bg-green-500',
                                text: 'text-green-900'
                              },
                              gray: {
                                selected: 'border-gray-500 bg-gray-50',
                                unselected: 'border-gray-200 bg-white hover:border-gray-300',
                                indicator: 'border-gray-500 bg-gray-500',
                                text: 'text-gray-900'
                              }
                            };
                            
                            const colors = colorClasses[group.color as keyof typeof colorClasses];
                            
                            return (
                              <div
                                key={product.id}
                                onClick={() => handleProductToggle(product.name)}
                                className={`
                                  relative p-3 border rounded-lg cursor-pointer transition-all duration-150 hover:shadow-sm
                                  ${isSelected ? colors.selected : colors.unselected}
                                `}
                              >
                                {/* Selection Indicator */}
                                <div className={`
                                  absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center
                                  ${isSelected ? colors.indicator : 'border-gray-300 bg-white'}
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
                                    ${isSelected ? colors.text : 'text-gray-900'}
                                  `}>
                                    {product.name}
                                  </h4>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Unit Fields for this Group */}
                        {groupKey === 'routing' && isAnyRoutingProductSelected() && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Legacy Number of Units (for Orchestration) */}
                              <div>
                                <label className="block text-sm font-medium text-blue-700 mb-2">
                                  <span className="inline-flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Number of Units: Orchestration
                                    <span className="text-red-500 ml-1">*</span>
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={formData.template?.number_of_units || ''}
                                  onChange={(e) => handleUnitFieldChange('number_of_units', e.target.value)}
                                  className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                                    validationErrors.number_of_units 
                                      ? 'border-red-300' 
                                      : 'border-gray-300'
                                  }`}
                                  placeholder="Enter number of units"
                                />
                                {validationErrors.number_of_units && (
                                  <p className="mt-1 text-sm text-red-600">{validationErrors.number_of_units}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {groupKey === 'bookit' && (isProductSelected('BookIt for Forms') || isProductSelected('BookIt Links') || isProductSelected('BookIt Handoff') || isProductSelected('BookIt Handoff (without Smartrep)') || isProductSelected('BookIt Handoff (with Smartrep)')) && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {isProductSelected('BookIt for Forms') && (
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-2">
                                    <span className="inline-flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      BookIt for Forms Units
                                      <span className="text-red-500 ml-1">*</span>
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.template?.bookit_forms_units || ''}
                                    onChange={(e) => handleUnitFieldChange('bookit_forms_units', e.target.value)}
                                    className={`block w-full rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 ${
                                      validationErrors.bookit_forms_units 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="Enter number of units"
                                  />
                                  {validationErrors.bookit_forms_units && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.bookit_forms_units}</p>
                                  )}
                                </div>
                              )}
                              
                              {isProductSelected('BookIt Links') && (
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-2">
                                    <span className="inline-flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                      BookIt Links Units
                                      <span className="text-red-500 ml-1">*</span>
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.template?.bookit_links_units || ''}
                                    onChange={(e) => handleUnitFieldChange('bookit_links_units', e.target.value)}
                                    className={`block w-full rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 ${
                                      validationErrors.bookit_links_units 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="Enter number of units"
                                  />
                                  {validationErrors.bookit_links_units && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.bookit_links_units}</p>
                                  )}
                                </div>
                              )}
                              
                              {(isProductSelected('BookIt Handoff') || isProductSelected('BookIt Handoff (without Smartrep)') || isProductSelected('BookIt Handoff (with Smartrep)')) && (
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-2">
                                    <span className="inline-flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                      </svg>
                                      BookIt Handoff Units
                                      <span className="text-red-500 ml-1">*</span>
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.template?.bookit_handoff_units || ''}
                                    onChange={(e) => handleUnitFieldChange('bookit_handoff_units', e.target.value)}
                                    className={`block w-full rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                                      validationErrors.bookit_handoff_units 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="Enter number of units"
                                  />
                                  {validationErrors.bookit_handoff_units && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.bookit_handoff_units}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Required Fields Missing:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {Object.values(validationErrors).map((error, index) => (
              <li key={`validation-error-${index}-${error.slice(0, 20)}`}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
} 