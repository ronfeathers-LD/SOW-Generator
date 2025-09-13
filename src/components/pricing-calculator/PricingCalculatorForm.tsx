'use client';

import { useState, useEffect } from 'react';
import { isRoutingProductById, isLeadToAccountProductById, isFormsProductById, isLinksProductById, isHandoffProductById } from '@/lib/constants/products';

interface Product {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CalculatorData {
  products: string[];
  number_of_units: string;
  orchestration_units: string;
  bookit_forms_units: string;
  bookit_links_units: string;
  bookit_handoff_units: string;
  account_segment?: string;
  pm_hours_removed?: boolean;
  discount_type?: 'none' | 'fixed' | 'percentage';
  discount_amount?: number;
  discount_percentage?: number;
}

interface PricingCalculatorFormProps {
  products: Product[];
  data: CalculatorData;
  onChange: (data: CalculatorData) => void;
}

export default function PricingCalculatorForm({ products, data, onChange }: PricingCalculatorFormProps) {
  const [localData, setLocalData] = useState<CalculatorData>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleProductToggle = (productName: string) => {
    const newProducts = localData.products.includes(productName)
      ? localData.products.filter(p => p !== productName)
      : [...localData.products, productName];
    
    const newData = { ...localData, products: newProducts };
    setLocalData(newData);
    onChange(newData);
  };

  const handleUnitChange = (field: keyof CalculatorData, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange(newData);
  };

  const handleAccountSegmentChange = (segment: string) => {
    const newData = { ...localData, account_segment: segment === '' ? undefined : segment };
    setLocalData(newData);
    onChange(newData);
  };

  const handlePMHoursToggle = (removed: boolean) => {
    const newData = { ...localData, pm_hours_removed: removed };
    setLocalData(newData);
    onChange(newData);
  };

  const handleDiscountTypeChange = (type: 'none' | 'fixed' | 'percentage') => {
    const newData = { 
      ...localData, 
      discount_type: type,
      discount_amount: type === 'none' ? 0 : localData.discount_amount || 0,
      discount_percentage: type === 'none' ? 0 : localData.discount_percentage || 0,
    };
    setLocalData(newData);
    onChange(newData);
  };

  const handleDiscountAmountChange = (amount: number) => {
    const newData = { ...localData, discount_amount: amount };
    setLocalData(newData);
    onChange(newData);
  };

  const isProductSelected = (productName: string) => {
    return localData.products.includes(productName);
  };

  // Group products by category
  const groupProducts = (products: Product[]) => {
    const groups = {
      routing: {
        title: 'Routing & Orchestration',
        icon: '⚡',
        color: 'blue',
        products: products.filter(p => 
          isRoutingProductById(p.id) || isLeadToAccountProductById(p.id)
        )
      },
      bookit: {
        title: 'BookIt Family',
        icon: '📋',
        color: 'green',
        products: products.filter(p => 
          isFormsProductById(p.id) || isLinksProductById(p.id) || isHandoffProductById(p.id)
        )
      },
      other: {
        title: 'Other Products',
        icon: '🔧',
        color: 'gray',
        products: products.filter(p => 
          !isRoutingProductById(p.id) && 
          !isLeadToAccountProductById(p.id) &&
          !isFormsProductById(p.id) &&
          !isLinksProductById(p.id) &&
          !isHandoffProductById(p.id)
        )
      }
    };

    return Object.entries(groups).filter(([, group]) => group.products.length > 0);
  };

  const getUnitFieldName = (productId: string): keyof CalculatorData | null => {
    if (isLeadToAccountProductById(productId) || isRoutingProductById(productId)) {
      return 'number_of_units';
    } else if (isFormsProductById(productId)) {
      return 'bookit_forms_units';
    } else if (isLinksProductById(productId)) {
      return 'bookit_links_units';
    } else if (isHandoffProductById(productId)) {
      return 'bookit_handoff_units';
    }
    return null;
  };

  const getUnitLabel = (productId: string): string => {
    if (isLeadToAccountProductById(productId) || isRoutingProductById(productId)) {
      return 'Users/Endpoints';
    } else if (isFormsProductById(productId) || isLinksProductById(productId) || isHandoffProductById(productId)) {
      return 'Users';
    }
    return 'Units';
  };

  const productGroups = groupProducts(products);

  return (
    <div className="space-y-6">
      {/* Account Segment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Segment
        </label>
        <select
          value={localData.account_segment || ''}
          onChange={(e) => handleAccountSegmentChange(e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Account Segment</option>
          <option value="MM">MidMarket (MM)</option>
          <option value="Enterprise">Enterprise</option>
          <option value="SMB">SMB</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          MidMarket accounts get 5 additional hours
        </p>
      </div>

      {/* PM Hours Removal Toggle */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localData.pm_hours_removed || false}
            onChange={(e) => handlePMHoursToggle(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Remove Project Manager hours
          </span>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          When enabled, Project Manager hours will be excluded from calculations (PM Hours Removal requires Approval)
        </p>
      </div>

      {/* Discount Configuration */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Discount Configuration</h3>
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
            <select
              value={localData.discount_type || 'none'}
              onChange={(e) => handleDiscountTypeChange(e.target.value as 'none' | 'fixed' | 'percentage')}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">No Discount</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          
          {(localData.discount_type === 'fixed' || localData.discount_type === 'percentage') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {localData.discount_type === 'fixed' ? 'Discount Amount ($)' : 'Discount Percentage (%)'}
              </label>
              <input
                type="number"
                value={localData.discount_amount || ''}
                onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={localData.discount_type === 'fixed' ? '0.00' : '0'}
                step={localData.discount_type === 'fixed' ? '0.01' : '0.1'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Products Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Products</h3>
        <div className="space-y-6">
          {productGroups.map(([key, group]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">{group.icon}</span>
                {group.title}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {group.products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`product-${product.id}`}
                        checked={isProductSelected(product.id)}
                        onChange={() => handleProductToggle(product.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`product-${product.id}`} className="ml-3 text-sm font-medium text-gray-900">
                        {product.name}
                      </label>
                    </div>
                    {isProductSelected(product.id) && getUnitFieldName(product.id) && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">
                          {getUnitLabel(product.id)}:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={localData[getUnitFieldName(product.id) as keyof CalculatorData] as string}
                          onChange={(e) => handleUnitChange(getUnitFieldName(product.id) as keyof CalculatorData, e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Units */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Units</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orchestration Units
            </label>
            <input
              type="number"
              min="0"
              value={localData.orchestration_units}
              onChange={(e) => handleUnitChange('orchestration_units', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
            <p className="mt-1 text-sm text-gray-500">
              Additional orchestration units beyond routing products
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Configuration Summary</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Selected Products:</strong> {localData.products.length}</p>
          <p><strong>Account Segment:</strong> {localData.account_segment || 'Not specified'}</p>
          <p><strong>Total Units:</strong> {
            (parseInt(localData.number_of_units) || 0) + 
            (parseInt(localData.orchestration_units) || 0) + 
            Math.max(
              parseInt(localData.bookit_forms_units) || 0,
              parseInt(localData.bookit_links_units) || 0,
              parseInt(localData.bookit_handoff_units) || 0
            )
          }</p>
        </div>
      </div>
    </div>
  );
}
