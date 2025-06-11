'use client';

import { useState, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google: any;
  }
}

interface SOWFormProps {
  initialData?: SOWData;
}

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function SOWForm({ initialData }: SOWFormProps) {
  const [formData, setFormData] = useState<Partial<SOWData>>(
    initialData
      ? {
          ...initialData,
          scope: {
            ...initialData.scope,
            deliverables: initialData.deliverables || '',
          },
        }
      : {
          header: {
            companyLogo: '',
            clientName: '',
            sowTitle: '',
            effectiveDate: new Date(),
          },
          clientSignature: {
            name: '',
            title: '',
            email: '',
            signatureDate: new Date(),
          },
          scope: {
            projectDescription: '',
            deliverables: '',
            timeline: {
              startDate: new Date(),
              duration: '',
            },
          },
          roles: {
            clientRoles: [{
              role: '',
              name: '',
              email: '',
              responsibilities: '',
            }],
          },
          pricing: {
            roles: [{
              role: '',
              ratePerHour: 0,
              totalHours: 0,
            }],
            billing: {
              companyName: '',
              billingContact: '',
              billingAddress: '',
              billingEmail: '',
              poNumber: '',
              paymentTerms: '',
              currency: '',
            },
          },
          assumptions: {
            accessRequirements: '',
            travelRequirements: '',
            workingHours: '',
            testingResponsibilities: '',
          },
          addendums: [{
            title: '',
            content: '',
            risks: [''],
            mitigations: [''],
            supportScope: {
              supported: [''],
              notSupported: [''],
            },
          }],
        }
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.header?.companyLogo || null);
  const [activeTab, setActiveTab] = useState('Header');
  const router = useRouter();
  const billingAddressRef = useRef<HTMLInputElement>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const MAPBOX_TOKEN = 'pk.eyJ1Ijoid2ViZmVhdGhlcnMiLCJhIjoiY21icjc3ZWphMDg5ZTJscHVvcm9lbWZ6OCJ9.iLDG5SKZrOE4p7aHStGzrw'; // <-- User's actual token

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      // Convert the file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({
          ...formData,
          header: { ...formData.header!, companyLogo: base64String }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing!,
        billing: { ...formData.pricing?.billing!, billingAddress: value }
      }
    });
    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=US&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setAddressSuggestions(data.features.map((item: any) => item.place_name));
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing!,
        billing: { ...formData.pricing?.billing!, billingAddress: suggestion }
      }
    });
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.clientSignerName?.trim()) {
      alert('Please enter the signer\'s name');
      return;
    }

    try {
      const url = initialData ? `/api/sow/${initialData.id}` : '/api/sow';
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save SOW');
      }
      
      const data = await response.json();
      // Redirect to the SOW view page
      router.push(`/sow/${data.id || initialData?.id}`);
    } catch (error) {
      console.error('Error saving SOW:', error);
      alert('Failed to save SOW. Please try again.');
    }
  };

  const tabs = [
    { key: 'Header', label: 'Header Information' },
    { key: 'Signature', label: 'Client Signature' },
    { key: 'Scope', label: 'Project Scope' },
    { key: 'ClientRoles', label: 'Client Roles' },
    { key: 'PricingRoles', label: 'Pricing Roles' },
    { key: 'Billing', label: 'Billing Information' },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                (activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
                ' whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Header Section */}
      {activeTab === 'Header' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Header Information</h2>
          
          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Client Logo</label>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative w-32 h-16">
                    <Image
                      src={logoPreview}
                      alt="Client logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No logo</span>
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Upload a logo image (PNG, JPG, or GIF)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Name</label>
              <input
                type="text"
                value={formData.header?.clientName}
                onChange={(e) => setFormData({
                  ...formData,
                  header: { ...formData.header!, clientName: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                value={formData.header?.sowTitle}
                onChange={(e) => setFormData({
                  ...formData,
                  header: { ...formData.header!, sowTitle: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* Client Signature Section */}
      {activeTab === 'Signature' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Client Signature Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Signator Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.clientSignerName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  clientSignerName: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter signer's full name"
              />
              <p className="mt-1 text-sm text-gray-500">This field is required</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={formData.clientSignature?.title}
                onChange={(e) => setFormData({
                  ...formData,
                  clientSignature: { ...formData.clientSignature!, title: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.clientSignature?.email}
                onChange={(e) => setFormData({
                  ...formData,
                  clientSignature: { ...formData.clientSignature!, email: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* Project Scope Section */}
      {activeTab === 'Scope' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Project Scope</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deliverables</label>
            <div className="mt-2">
              <ReactQuill
                value={formData.scope && typeof formData.scope.deliverables === 'string' ? formData.scope.deliverables : ''}
                onChange={(value) => setFormData({
                  ...formData,
                  scope: { ...formData.scope!, deliverables: value }
                })}
                theme="snow"
                modules={{ toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'bullet' }], ['link']] }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (weeks)</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={formData.scope?.timeline?.duration || ''}
              onChange={(e) => setFormData({
                ...formData,
                scope: {
                  ...formData.scope!,
                  timeline: {
                    ...formData.scope?.timeline!,
                    duration: e.target.value.replace(/[^0-9]/g, '')
                  }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter number of weeks"
            />
          </div>
        </section>
      )}

      {/* Client Roles Section */}
      {activeTab === 'ClientRoles' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Client Roles</h2>
          {formData.roles?.clientRoles.map((role, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={role.role}
                    onChange={(e) => {
                      const newRoles = [...(formData.roles?.clientRoles || [])];
                      newRoles[index] = { ...newRoles[index], role: e.target.value };
                      setFormData({
                        ...formData,
                        roles: { ...formData.roles!, clientRoles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={role.name}
                    onChange={(e) => {
                      const newRoles = [...(formData.roles?.clientRoles || [])];
                      newRoles[index] = { ...newRoles[index], name: e.target.value };
                      setFormData({
                        ...formData,
                        roles: { ...formData.roles!, clientRoles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={role.email}
                    onChange={(e) => {
                      const newRoles = [...(formData.roles?.clientRoles || [])];
                      newRoles[index] = { ...newRoles[index], email: e.target.value };
                      setFormData({
                        ...formData,
                        roles: { ...formData.roles!, clientRoles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
                  <textarea
                    value={role.responsibilities}
                    onChange={(e) => {
                      const newRoles = [...(formData.roles?.clientRoles || [])];
                      newRoles[index] = { ...newRoles[index], responsibilities: e.target.value };
                      setFormData({
                        ...formData,
                        roles: { ...formData.roles!, clientRoles: newRoles }
                      });
                    }}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const newRoles = formData.roles?.clientRoles.filter((_, i) => i !== index) || [];
                    setFormData({
                      ...formData,
                      roles: { ...formData.roles!, clientRoles: newRoles }
                    });
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove Role
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newRoles = [...(formData.roles?.clientRoles || []), {
                role: '',
                name: '',
                email: '',
                responsibilities: ''
              }];
              setFormData({
                ...formData,
                roles: { ...formData.roles!, clientRoles: newRoles }
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Client Role
          </button>
        </section>
      )}

      {/* Pricing Roles Section */}
      {activeTab === 'PricingRoles' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Pricing Roles</h2>
          {formData.pricing?.roles?.map((role, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={role.role}
                    onChange={(e) => {
                      const newRoles = [...(formData.pricing?.roles || [])];
                      newRoles[index] = { ...newRoles[index], role: e.target.value };
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing!, roles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rate per Hour</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={role.ratePerHour}
                    onChange={(e) => {
                      const newRoles = [...(formData.pricing?.roles || [])];
                      newRoles[index] = { ...newRoles[index], ratePerHour: parseFloat(e.target.value) };
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing!, roles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={role.totalHours}
                    onChange={(e) => {
                      const newRoles = [...(formData.pricing?.roles || [])];
                      newRoles[index] = { ...newRoles[index], totalHours: parseInt(e.target.value, 10) };
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing!, roles: newRoles }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const newRoles = formData.pricing?.roles.filter((_, i) => i !== index) || [];
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing!, roles: newRoles }
                    });
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove Role
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newRoles = [...(formData.pricing?.roles || []), {
                role: '',
                ratePerHour: 0,
                totalHours: 0,
              }];
              setFormData({
                ...formData,
                pricing: { ...formData.pricing!, roles: newRoles }
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Pricing Role
          </button>
        </section>
      )}

      {/* Billing Information Section */}
      {activeTab === 'Billing' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Billing Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                value={formData.pricing?.billing?.companyName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, companyName: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing Contact Name</label>
              <input
                type="text"
                value={formData.pricing?.billing?.billingContact || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, billingContact: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700">Billing Address</label>
              <input
                type="text"
                ref={billingAddressRef}
                value={formData.pricing?.billing?.billingAddress || ''}
                onChange={handleAddressInput}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Start typing address..."
                autoComplete="off"
                onFocus={() => setShowSuggestions(addressSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              />
              <p className="mt-1 text-xs text-gray-500">Address autocomplete powered by Mapbox. <span className="text-red-500 font-semibold">You must provide your Mapbox public token in the code.</span></p>
              {showSuggestions && addressSuggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow max-h-48 overflow-auto">
                  {addressSuggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="px-4 py-2 cursor-pointer hover:bg-indigo-100"
                      onMouseDown={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing Email</label>
              <input
                type="email"
                value={formData.pricing?.billing?.billingEmail || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, billingEmail: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Purchase Order Number</label>
              <input
                type="text"
                value={formData.pricing?.billing?.poNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, poNumber: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
              <input
                type="text"
                value={formData.pricing?.billing?.paymentTerms || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, paymentTerms: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <input
                type="text"
                value={formData.pricing?.billing?.currency || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: {
                    ...formData.pricing!,
                    billing: { ...formData.pricing?.billing!, currency: e.target.value }
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {initialData ? 'Update SOW' : 'Save SOW'}
        </button>
      </div>
    </form>
  );
} 