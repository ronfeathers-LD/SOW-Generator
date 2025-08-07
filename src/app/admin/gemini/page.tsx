'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface GeminiConfig {
  id?: string;
  apiKey: string;
  modelName?: string;
  isConfigured: boolean;
  lastTested?: string;
  lastError?: string;
}

const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Latest & Fastest)', description: 'Latest model, fastest performance' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)', description: 'Fast model, commonly overloaded' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Recommended)', description: 'More capable, often less load' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro (Fallback)', description: 'Older model, usually available' },
  { value: 'gemini-pro', label: 'Gemini Pro (Legacy)', description: 'Legacy model, most reliable' }
];

export default function GeminiAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<GeminiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    fetchConfig();
  }, [session, status, router]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/gemini/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setApiKey(data.apiKey || '');
        setSelectedModel(data.modelName || 'gemini-2.5-flash');
      }
    } catch (error) {
      console.error('Error fetching Gemini config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/gemini/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, modelName: selectedModel }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setTestResult({ success: true, message: 'Configuration saved successfully!' });
      } else {
        const error = await response.json();
        setTestResult({ success: false, message: error.error || 'Failed to save configuration' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

                const handleTest = async () => {
                setIsTesting(true);
                setTestResult(null);

                try {
                  const response = await fetch('/api/admin/gemini/test', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      apiKey,
                      modelName: selectedModel,
                      useFormData: true // Test with the form data instead of stored config
                    }),
                  });

                  const data = await response.json();

                  if (response.ok) {
                    setTestResult({ success: true, message: 'Gemini API connection successful! Test analysis completed.' });
                  } else {
                    setTestResult({ success: false, message: data.error || 'Failed to test Gemini API connection' });
                  }
                } catch {
                  setTestResult({ success: false, message: 'Failed to test Gemini API connection' });
                } finally {
                  setIsTesting(false);
                }
              };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Gemini AI Configuration</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure Google Gemini AI for transcription analysis and objective generation.
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* API Key Configuration */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter your Gemini API key"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Get your API key from{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                <div>
                  <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <select
                    id="modelName"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a model. If one is overloaded, try a different one.
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !apiKey.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting || !apiKey.trim()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Status and Test Results */}
            {config && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h2>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${config.isConfigured ? 'bg-green-400' : 'bg-red-400'} mr-3`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {config.isConfigured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  
                  {config.isConfigured && (
                    <p className="mt-2 text-sm text-gray-600">
                      Gemini AI is configured and ready to analyze transcriptions and generate objectives.
                    </p>
                  )}
                </div>
              </div>
            )}

            {testResult && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
                
                <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {testResult.success ? (
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Features</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="text-sm font-medium text-blue-900">Transcription Analysis</h3>
                  </div>
                  <p className="mt-2 text-sm text-blue-700">
                    Automatically analyze call transcriptions to extract key project objectives and scope items.
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-medium text-green-900">Objective Generation</h3>
                  </div>
                  <p className="mt-2 text-sm text-green-700">
                    Generate professional project objectives and scope items suitable for SOW documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 