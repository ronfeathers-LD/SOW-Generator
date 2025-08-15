'use client';

import React from 'react';

interface DynamicAIResponseProps {
  aiResponse: Record<string, unknown>; // Accept any response format
  customerName: string;
}

export default function DynamicAIResponse({ aiResponse, customerName }: DynamicAIResponseProps) {
  // If there's an error, show it
  if (aiResponse.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <h3 className="text-lg font-medium text-red-800 mb-2">AI Analysis Error</h3>
        <p className="text-red-700">{aiResponse.error as string}</p>
        {(aiResponse.rawContent as string) && (
          <details className="mt-3">
            <summary className="text-red-600 cursor-pointer">View Raw Response</summary>
            <pre className="mt-2 text-sm text-red-600 bg-red-100 p-3 rounded overflow-auto">
              {aiResponse.rawContent as string}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // Helper function to render different data types
  const renderValue = (value: unknown, key: string): React.ReactNode => {
    if (Array.isArray(value)) {
      return (
        <div key={key} className="mb-4">
          <h4 className="text-md font-semibold text-gray-800 mb-2 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {value.map((item, index) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ul>
        </div>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="mb-4">
          <h4 className="text-md font-semibold text-gray-800 mb-2 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <div className="pl-4">
            {Object.entries(value).map(([subKey, subValue]) => 
              renderValue(subValue, subKey)
            )}
          </div>
        </div>
      );
    }
    
    if (typeof value === 'string') {
      return (
        <div key={key} className="mb-4">
          <h4 className="text-md font-semibold text-gray-800 mb-2 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <p className="text-gray-700">{value}</p>
        </div>
      );
    }
    
    return null;
  };

  // Filter out internal fields and render the response
  const renderResponse = () => {
    const filteredResponse = { ...aiResponse };
    
    // Remove internal fields
    delete filteredResponse.isFallback;
    delete filteredResponse.error;
    delete filteredResponse.rawContent;
    
    return Object.entries(filteredResponse).map(([key, value]) => 
      renderValue(value, key)
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        AI Analysis Results for {customerName}
      </h3>
      
      <div className="space-y-4">
        {renderResponse()}
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 pt-4 border-t border-gray-200">
          <summary className="text-sm text-gray-500 cursor-pointer">Debug: Raw AI Response</summary>
          <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(aiResponse, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
