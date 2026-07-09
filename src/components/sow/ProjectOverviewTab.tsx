import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SOWData } from '@/types/sow';
import { Card, SectionHeader, Input, Select } from '@/components/ui/form';
import { isRoutingProductById, isLeadToAccountProductById, isFormsProductById, isLinksProductById, isHandoffProductById, isOtherProduct, productRequiresUnits } from '@/lib/constants/products';
import { 
  findProductByIdOrName, 
  isProductSelectedByIdOrName, 
  isAnyBookItProductSelected, 
  isFormsProductSelected, 
  isHandoffProductSelected 
} from '@/lib/utils/productCompatibility';
import { groupProductsByCategory, type CategoryRow } from '@/lib/sow/product-groups';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
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
  const [categories, setCategories] = useState<CategoryRow[]>([]);
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
    const opportunityName = formData.template?.opportunity_name || '';
    const createdDate = formatCreatedDate(formData.created_at);
    
    // Opportunity is always required, so use opportunity name format
    if (opportunityName && customerName) {
      return `${opportunityName} - ${customerName}`;
    } else if (customerName && createdDate) {
      // Fallback only if somehow customer name exists but opportunity doesn't
      return `${customerName} - ${createdDate}`;
    } else if (customerName) {
      return customerName;
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
        const catRes = await fetch('/api/admin/product-categories');
        if (catRes.ok) setCategories(await catRes.json());
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
  
  const handleProductToggle = (identifier: string) => {
    const currentProducts = formData.template?.products || [];
    const isCurrentlySelected = currentProducts.includes(identifier);

    // Handle mutual exclusivity for BookIt Handoff variants
    let newProducts: string[];
    const product = findProductByIdOrName(products, identifier);
    const isHandoffProductSelected = product && isHandoffProductById(product.id);
    
    if (isHandoffProductSelected) {
      if (isCurrentlySelected) {
        // If deselecting, just remove the current one
        newProducts = currentProducts.filter(p => p !== identifier);
      } else {
        // If selecting, remove the other variant and add the current one
        newProducts = currentProducts.filter(p => {
          const otherProduct = findProductByIdOrName(products, p);
          return !otherProduct || !isHandoffProductById(otherProduct.id);
        });
        newProducts.push(identifier);
      }
    } else {
      // Normal toggle behavior for other products
      newProducts = isCurrentlySelected
        ? currentProducts.filter(p => p !== identifier)
        : [...currentProducts, identifier];
    }
    
    // Prepare the updated template with new products
    const updatedTemplate = { ...formData.template!, products: newProducts };
    
    // Clear validation error and field value when product is deselected
    if (isCurrentlySelected) {
      const product = findProductByIdOrName(products, identifier);
      
      // Special handling for routing products - only clear orchestration_units if no routing products remain
      if (product && (isRoutingProductById(product.id) || isLeadToAccountProductById(product.id))) {
        const remainingProducts = newProducts.filter(p => {
          const remainingProduct = findProductByIdOrName(products, p);
          return remainingProduct && (isRoutingProductById(remainingProduct.id) || isLeadToAccountProductById(remainingProduct.id));
        });
        
        if (remainingProducts.length === 0) {
          // Clear orchestration units field and validation error when no routing products remain
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.orchestration_units;
            return newErrors;
          });
          
          updatedTemplate.orchestration_units = '';
        }
      } else {
        // For non-routing products, clear the specific field immediately
        const fieldName = product ? getUnitFieldName(product.id) : null;
        if (fieldName && fieldName !== 'orchestration_units') {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
          
          // Clear the field value when product is deselected
          if (fieldName === 'bookit_forms_units') {
            updatedTemplate.bookit_forms_units = '';
          } else if (fieldName === 'bookit_links_units') {
            updatedTemplate.bookit_links_units = '';
          } else if (fieldName === 'bookit_handoff_units') {
            updatedTemplate.bookit_handoff_units = '';
          } else if (fieldName === 'other_products_units') {
            updatedTemplate.other_products_units = '';
          }
        }
      }
    }
    
    // Update form data once with all changes
    setFormData({
      ...formData,
      template: updatedTemplate
    });
  };

  const isProductSelected = (identifier: string) => {
    return isProductSelectedByIdOrName(selectedProducts, identifier);
  };

  // Helper function to check if any BookIt product is selected
  const isAnyBookItProductSelectedCallback = useCallback((): boolean => {
    return isAnyBookItProductSelected(products, selectedProducts);
  }, [selectedProducts, products]);

  // Helper function to check if Forms product is selected
  const isFormsProductSelectedCallback = useCallback((): boolean => {
    return isFormsProductSelected(products, selectedProducts);
  }, [selectedProducts, products]);


  // Helper function to get the corresponding unit field name for a product
  // NOTE: the generic "other_products_units" field only applies to products in the
  // 'Other' category. A product in a new, uncataloged category (e.g. "Integrations")
  // that has requires_units=true will fall through to `null` here and get no unit
  // field / validation — this is a known limitation, not a bug. Extending unit-field
  // coverage to arbitrary categories is out of scope for the category-driven grouping
  // change (see product-groups.ts); revisit if a new category needs its own units.
  const getUnitFieldName = (productId: string): string | null => {
    if (isRoutingProductById(productId) || isLeadToAccountProductById(productId)) {
      return 'orchestration_units';
    } else if (isFormsProductById(productId)) {
      return 'bookit_forms_units';
    } else if (isLinksProductById(productId)) {
      return 'bookit_links_units';
    } else if (isHandoffProductById(productId)) {
      return 'bookit_handoff_units';
    } else {
      // Check if it's an "other" product by looking up the product in the products array
      const product = products.find(p => p.id === productId);
      if (product && isOtherProduct(product)) {
        return 'other_products_units';
      }
    }
    return null;
  };

  // Helper function to check if any product requiring units is selected
  const isAnyProductRequiringUnitsSelectedCallback = useCallback((): boolean => {
    return selectedProducts.some(identifier => {
      const product = findProductByIdOrName(products, identifier);
      return product && (productRequiresUnits(product) || isRoutingProductById(product.id) || isLeadToAccountProductById(product.id));
    });
  }, [selectedProducts, products]);

  // Validation function
  const validateUnitFields = useCallback(() => {
    const errors: Record<string, string> = {};
    
    // Helper function to check if a unit field is required
    const isUnitFieldRequired = (fieldName: string): boolean => {
      if (fieldName === 'number_of_units') {
        return isAnyProductRequiringUnitsSelectedCallback();
      }
      
      return selectedProducts.some(identifier => {
        const product = findProductByIdOrName(products, identifier);
        if (!product) return false;
        
        // Smart validation: check if product requires units and matches the field type
        switch (fieldName) {
          case 'orchestration_units':
            // Orchestration units: required if ANY product that uses orchestration units is selected
            // This includes all routing products (FlowBuilders + Lead to Account) regardless of category name
            return isRoutingProductById(product.id) || isLeadToAccountProductById(product.id);
          case 'bookit_forms_units':
            // BookIt Forms: specific product that requires units
            return productRequiresUnits(product) && isFormsProductById(product.id);
          case 'bookit_links_units':
            // BookIt Links: specific product that requires units
            return productRequiresUnits(product) && isLinksProductById(product.id);
          case 'bookit_handoff_units':
            // BookIt Handoff: specific product that requires units
            return productRequiresUnits(product) && isHandoffProductById(product.id);
          case 'other_products_units':
            // Other products: shared units across all other products that require units
            return productRequiresUnits(product) && isOtherProduct(product);
          case 'regions':
            // Regions: required if MultiGraph is selected
            return product.id === '511f28fa-6cc4-41f9-9234-dc45056aa2d2' || 
                   product.name.toLowerCase() === 'multigraph';
          default:
            return false;
        }
      });
    };
    
    // Check each unit field
    const unitFields = ['orchestration_units', 'bookit_forms_units', 'bookit_links_units', 'bookit_handoff_units', 'other_products_units', 'regions'];
    
    unitFields.forEach(fieldName => {
      if (isUnitFieldRequired(fieldName)) {
        const value = formData.template?.[fieldName as keyof typeof formData.template] as string;
      if (!value || value.trim() === '') {
          // Get product names for error messages based on field type
          let productDisplayName = '';
          
          if (fieldName === 'orchestration_units') {
            // Use a generic message for orchestration units
            productDisplayName = 'Orchestration Units';
          } else if (fieldName === 'bookit_forms_units') {
            const formsProduct = selectedProducts
              .map(identifier => findProductByIdOrName(products, identifier))
              .find(product => product && isFormsProductById(product.id));
            productDisplayName = formsProduct?.name || 'BookIt for Forms';
          } else if (fieldName === 'bookit_links_units') {
            const linksProduct = selectedProducts
              .map(identifier => findProductByIdOrName(products, identifier))
              .find(product => product && isLinksProductById(product.id));
            productDisplayName = linksProduct?.name || 'BookIt Links';
          } else if (fieldName === 'bookit_handoff_units') {
            const handoffProducts = selectedProducts
              .map(identifier => findProductByIdOrName(products, identifier))
              .filter(product => product && isHandoffProductById(product.id))
              .map(product => product!.name);
            
            if (handoffProducts.length > 0) {
              productDisplayName = handoffProducts.join(', ');
            } else {
              productDisplayName = 'BookIt Handoff products';
            }
          } else if (fieldName === 'other_products_units') {
            const otherProducts = selectedProducts
              .map(identifier => findProductByIdOrName(products, identifier))
              .filter(product => product && productRequiresUnits(product) && isOtherProduct(product))
              .map(product => product!.name);
            
            if (otherProducts.length > 0) {
              productDisplayName = otherProducts.join(', ');
            } else {
              productDisplayName = 'Other products';
            }
          } else if (fieldName === 'regions') {
            productDisplayName = 'Number of regions';
          }
          
          if (fieldName === 'orchestration_units') {
            errors[fieldName] = `${productDisplayName} is required when FlowBuilder products are selected`;
          } else if (fieldName === 'regions') {
            errors[fieldName] = `${productDisplayName} is required for MultiGraph`;
          } else {
            errors[fieldName] = `${productDisplayName} Units is required when ${productDisplayName} is selected`;
          }
        }
      }
    });

    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    return isValid;
  }, [formData, selectedProducts, isAnyProductRequiringUnitsSelectedCallback, products]);

  // Run validation whenever form data or selected products change
  useEffect(() => {
    // Only run validation if form data is available
    if (formData.template && Object.keys(formData.template).length > 0) {
      validateUnitFields();
    }
  }, [validateUnitFields, formData.template]);

  // Check if MultiGraph is selected - moved to top level to avoid hooks order issues
  const isMultiGraphSelected = useMemo(() => {
    return selectedProducts.some(identifier => {
      if (identifier === '511f28fa-6cc4-41f9-9234-dc45056aa2d2') return true;
      if (identifier.toLowerCase() === 'multigraph') return true;
      const product = findProductByIdOrName(products, identifier);
      return product ? product.id === '511f28fa-6cc4-41f9-9234-dc45056aa2d2' : false;
    });
  }, [selectedProducts, products]);

  // Clear validation errors when orchestration_units has a value
  useEffect(() => {
    if (formData.template?.orchestration_units && validationErrors.orchestration_units) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.orchestration_units;
        return newErrors;
      });
    }
  }, [formData.template?.orchestration_units, validationErrors.orchestration_units]);

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

  // The unit-count fields a product group needs, given the current selection —
  // rendered inline beneath that group's chips. Several values are SHARED across
  // products (one orchestration count for all FlowBuilder products, one handoff
  // count for both handoff products, one count across all Other products), so a
  // shared field appears once per group rather than once per chip.
  const unitFieldsForGroup = (
    groupKey: string,
  ): Array<{ key: string; label: string; placeholder: string }> => {
    const some = (pred: (p: Product) => boolean) =>
      selectedProducts.some((identifier) => {
        const product = findProductByIdOrName(products, identifier);
        return !!product && pred(product);
      });
    const fields: Array<{ key: string; label: string; placeholder: string }> = [];
    if (groupKey === 'FlowBuilder') {
      if (some((p) => isRoutingProductById(p.id) || isLeadToAccountProductById(p.id))) {
        fields.push({ key: 'orchestration_units', label: 'Orchestration units', placeholder: 'Enter number of units' });
      }
      if (isMultiGraphSelected) {
        fields.push({ key: 'regions', label: 'Number of regions (MultiGraph)', placeholder: 'Enter number of regions' });
      }
    } else if (groupKey === 'BookIt' && isAnyBookItProductSelectedCallback()) {
      if (isFormsProductSelectedCallback()) fields.push({ key: 'bookit_forms_units', label: 'BookIt for Forms units', placeholder: 'Enter number of units' });
      if (some((p) => isLinksProductById(p.id))) fields.push({ key: 'bookit_links_units', label: 'BookIt Links units', placeholder: 'Enter number of units' });
      if (some((p) => isHandoffProductById(p.id))) fields.push({ key: 'bookit_handoff_units', label: 'BookIt Handoff units', placeholder: 'Enter number of units' });
    } else if (groupKey === 'Other') {
      if (some((p) => productRequiresUnits(p) && isOtherProduct(p))) {
        fields.push({ key: 'other_products_units', label: 'Other products units', placeholder: 'Enter number of units' });
      }
    }
    return fields;
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Project Overview"
        description="Set the SOW title and project configuration"
      />

      {/* SOW Title */}
      <Card padding="md">
        <SectionHeader as="h3" title="SOW Title" className="mb-4" />
        <div className="max-w-2xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Statement of Work Title
            </span>
            </label>
            <Input
              type="text"
            value={formData.template?.sow_title ?? getDefaultTitle()}
            onChange={(e) => setFormData({
                  ...formData,
              template: { ...formData.template!, sow_title: e.target.value }
            })}
            placeholder={getDefaultTitle()}
          />
          <p className="mt-2 text-sm text-gray-500">
            Customize the title for this Statement of Work. The default format is &quot;[Opportunity Name] - [Account Name]&quot;.
          </p>
        </div>
      </Card>

      {/* Project Configuration */}
      <Card padding="md">
        <SectionHeader as="h3" title="Project Configuration" className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              Salesforce Tenants
              </span>
            </label>
            <Input
              type="text"
              value={formData.template?.salesforce_tenants || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, salesforce_tenants: e.target.value || '' }
              })}
              placeholder="Enter number of Salesforce tenants"
            />
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">
              Tenant Names
            </label>
            <Input
              type="text"
              value={formData.template?.salesforce_tenant_names || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, salesforce_tenant_names: e.target.value || '' }
              })}
              placeholder="e.g. Prod; UAT sandbox 'uat2'; Dev"
            />
            <p className="mt-2 text-sm text-gray-500">
              Name each tenant/sandbox in scope
            </p>
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
            <Input
              type="text"
              value={formData.template?.timeline_weeks || ''}
              onChange={(e) => {
                const weeks = e.target.value;
                setFormData({
                  ...formData,
                  template: { ...formData.template!, timeline_weeks: weeks }
                });
              }}
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
            <Select
              value={formData.template?.units_consumption || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, units_consumption: e.target.value }
              })}
            >
              <option value="">Select consumption pattern</option>
              <option value="All units immediately">All units immediately</option>
              <option value="Gradual consumption over timeline">Gradual consumption over timeline</option>
              <option value="Custom consumption pattern">Custom consumption pattern</option>
            </Select>
          </div>
        </div>
      </Card>
      
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
                    groupProductsByCategory(products, categories).map((group) => (
                      <div key={group.key} className="space-y-3">
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
                            const isSelected = isProductSelected(product.id);
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
                                onClick={() => handleProductToggle(product.id)}
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
                        
                        {/* Required unit counts for this group — shown inline,
                            attached beneath the group's product chips. */}
                        {(() => {
                          const unitFields = unitFieldsForGroup(group.key);
                          if (unitFields.length === 0) return null;
                          const rail =
                            group.color === 'green'
                              ? 'border-green-400 dark:border-green-700'
                              : group.color === 'gray'
                                ? 'border-gray-400 dark:border-dark-border'
                                : 'border-blue-400 dark:border-blue-700';
                          return (
                            <div className={`ml-1 mt-1 space-y-3 border-l-2 ${rail} pl-4`}>
                              {unitFields.map((f) => (
                                <div key={f.key} className="max-w-xs">
                                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                                    {f.label} <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    type="text"
                                    value={(formData.template as Record<string, string | undefined> | undefined)?.[f.key] || ''}
                                    onChange={(e) => handleUnitFieldChange(f.key, e.target.value)}
                                    error={!!validationErrors[f.key]}
                                    placeholder={f.placeholder}
                                  />
                                  {validationErrors[f.key] && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors[f.key]}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>


    </section>
  );
}