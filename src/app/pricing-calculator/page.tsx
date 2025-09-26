'use client';

import { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import PricingCalculatorForm from '@/components/pricing-calculator/PricingCalculatorForm';
import PricingCalculatorResults from '@/components/pricing-calculator/PricingCalculatorResults';
import SOWDataLoader from '@/components/pricing-calculator/SOWDataLoader';

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

export default function PricingCalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [calculatorData, setCalculatorData] = useState<CalculatorData>({
    products: [],
    number_of_units: '',
    orchestration_units: '',
    bookit_forms_units: '',
    bookit_links_units: '',
    bookit_handoff_units: '',
    account_segment: undefined,
    pm_hours_removed: false,
    discount_type: 'none',
    discount_amount: 0,
    discount_percentage: 0,
  });
  const [showSOWLoader, setShowSOWLoader] = useState(false);
  const [scenarios, setScenarios] = useState<CalculatorData[]>([]);
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);

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

  const handleDataLoad = (sowData: SOWData) => {
    const newData: CalculatorData = {
      products: sowData.template?.products || [],
      number_of_units: sowData.template?.number_of_units || '',
      orchestration_units: sowData.template?.orchestration_units || '',
      bookit_forms_units: sowData.template?.bookit_forms_units || '',
      bookit_links_units: sowData.template?.bookit_links_units || '',
      bookit_handoff_units: sowData.template?.bookit_handoff_units || '',
      account_segment: sowData.selectedAccount?.Employee_Band__c,
      pm_hours_removed: sowData.pm_hours_requirement_disabled || false,
      discount_type: sowData.pricing?.discount_type || 'none',
      discount_amount: sowData.pricing?.discount_amount || 0,
      discount_percentage: sowData.pricing?.discount_percentage || 0,
    };
    
    setCalculatorData(newData);
    setShowSOWLoader(false);
  };

  const handleDataChange = (newData: CalculatorData) => {
    setCalculatorData(newData);
  };

  const handleCreateScenario = () => {
    const newScenario = { ...calculatorData };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioIndex(scenarios.length);
  };

  const handleScenarioChange = (index: number, newData: CalculatorData) => {
    const updatedScenarios = [...scenarios];
    updatedScenarios[index] = newData;
    setScenarios(updatedScenarios);
  };

  const handleRemoveScenario = (index: number) => {
    const updatedScenarios = scenarios.filter((_, i) => i !== index);
    setScenarios(updatedScenarios);
    if (activeScenarioIndex >= updatedScenarios.length) {
      setActiveScenarioIndex(Math.max(0, updatedScenarios.length - 1));
    }
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pricing Calculator</h1>
          <p className="mt-2 text-gray-600">
            Calculate project costs based on products and user counts. Compare different scenarios and pre-load data from existing SOWs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowSOWLoader(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
            style={{
              backgroundColor: '#2a2a2a',
              color: 'white',
              border: '1px solid #26D07C'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#01eb1d';
              (e.target as HTMLElement).style.color = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#2a2a2a';
              (e.target as HTMLElement).style.color = 'white';
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Load from SOW
          </button>
          
          <button
            onClick={handleCreateScenario}
            className="btn-secondary-cta inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Scenario
          </button>
        </div>

        {/* Scenarios Tabs */}
        {scenarios.length > 0 && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveScenarioIndex(-1)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeScenarioIndex === -1
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Current Configuration
                </button>
                {scenarios.map((_, index) => (
                  <div key={index} className="flex items-center">
                    <button
                      onClick={() => setActiveScenarioIndex(index)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeScenarioIndex === index
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Scenario {index + 1}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveScenario(index);
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 p-1"
                      title="Remove scenario"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {activeScenarioIndex === -1 ? 'Configuration' : `Scenario ${activeScenarioIndex + 1}`}
              </h2>
            </div>
            <div className="p-6">
              <PricingCalculatorForm
                products={products}
                data={activeScenarioIndex === -1 ? calculatorData : scenarios[activeScenarioIndex] || calculatorData}
                onChange={activeScenarioIndex === -1 ? handleDataChange : (newData) => handleScenarioChange(activeScenarioIndex, newData)}
              />
            </div>
          </div>

          {/* Results */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Calculation Results</h2>
            </div>
            <div className="p-6">
              <PricingCalculatorResults
                data={activeScenarioIndex === -1 ? calculatorData : scenarios[activeScenarioIndex] || calculatorData}
                scenarios={scenarios}
              />
            </div>
          </div>
        </div>

        {/* SOW Data Loader Modal */}
        {showSOWLoader && (
          <SOWDataLoader
            isOpen={showSOWLoader}
            onClose={() => setShowSOWLoader(false)}
            onDataLoad={handleDataLoad}
          />
        )}
      </div>
    </div>
  );
}
