import React from 'react';
import { SOWData } from '@/types/sow';

interface AddendumsTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function AddendumsTab({
  formData,
  setFormData,
}: AddendumsTabProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Addendums</h2>
      
      {/* Addendums List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Addendums</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add any additional addendums, risks, mitigations, or support scope details
        </p>
        
        {formData.addendums?.map((addendum, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Addendum {index + 1}</h4>
              <button
                type="button"
                onClick={() => {
                  const newAddendums = formData.addendums?.filter((_, i) => i !== index) || [];
                  setFormData({
                    ...formData,
                    addendums: newAddendums
                  });
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove Addendum
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={addendum.title}
                  onChange={(e) => {
                    const newAddendums = [...(formData.addendums || [])];
                    newAddendums[index] = { ...addendum, title: e.target.value };
                    setFormData({
                      ...formData,
                      addendums: newAddendums
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Addendum title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  value={addendum.content}
                  onChange={(e) => {
                    const newAddendums = [...(formData.addendums || [])];
                    newAddendums[index] = { ...addendum, content: e.target.value };
                    setFormData({
                      ...formData,
                      addendums: newAddendums
                    });
                  }}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Addendum content..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Risks</label>
                <div className="space-y-2">
                  {addendum.risks?.map((risk, riskIndex) => (
                    <div key={riskIndex} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={risk}
                        onChange={(e) => {
                          const newAddendums = [...(formData.addendums || [])];
                          const newRisks = [...(addendum.risks || [])];
                          newRisks[riskIndex] = e.target.value;
                          newAddendums[index] = { ...addendum, risks: newRisks };
                          setFormData({
                            ...formData,
                            addendums: newAddendums
                          });
                        }}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder={`Risk ${riskIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newAddendums = [...(formData.addendums || [])];
                          const newRisks = addendum.risks?.filter((_, i) => i !== riskIndex) || [];
                          newAddendums[index] = { ...addendum, risks: newRisks };
                          setFormData({
                            ...formData,
                            addendums: newAddendums
                          });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newAddendums = [...(formData.addendums || [])];
                      const newRisks = [...(addendum.risks || []), ''];
                      newAddendums[index] = { ...addendum, risks: newRisks };
                      setFormData({
                        ...formData,
                        addendums: newAddendums
                      });
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Risk
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Mitigations</label>
                <div className="space-y-2">
                  {addendum.mitigations?.map((mitigation, mitigationIndex) => (
                    <div key={mitigationIndex} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={mitigation}
                        onChange={(e) => {
                          const newAddendums = [...(formData.addendums || [])];
                          const newMitigations = [...(addendum.mitigations || [])];
                          newMitigations[mitigationIndex] = e.target.value;
                          newAddendums[index] = { ...addendum, mitigations: newMitigations };
                          setFormData({
                            ...formData,
                            addendums: newAddendums
                          });
                        }}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder={`Mitigation ${mitigationIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newAddendums = [...(formData.addendums || [])];
                          const newMitigations = addendum.mitigations?.filter((_, i) => i !== mitigationIndex) || [];
                          newAddendums[index] = { ...addendum, mitigations: newMitigations };
                          setFormData({
                            ...formData,
                            addendums: newAddendums
                          });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newAddendums = [...(formData.addendums || [])];
                      const newMitigations = [...(addendum.mitigations || []), ''];
                      newAddendums[index] = { ...addendum, mitigations: newMitigations };
                      setFormData({
                        ...formData,
                        addendums: newAddendums
                      });
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Mitigation
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supported Items</label>
                  <div className="space-y-2">
                    {addendum.supportScope?.supported?.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newAddendums = [...(formData.addendums || [])];
                            const newSupported = [...(addendum.supportScope?.supported || [])];
                            newSupported[itemIndex] = e.target.value;
                            newAddendums[index] = { 
                              ...addendum, 
                              supportScope: { 
                                ...addendum.supportScope!, 
                                supported: newSupported 
                              } 
                            };
                            setFormData({
                              ...formData,
                              addendums: newAddendums
                            });
                          }}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder={`Supported item ${itemIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newAddendums = [...(formData.addendums || [])];
                            const newSupported = addendum.supportScope?.supported?.filter((_, i) => i !== itemIndex) || [];
                            newAddendums[index] = { 
                              ...addendum, 
                              supportScope: { 
                                ...addendum.supportScope!, 
                                supported: newSupported 
                              } 
                            };
                            setFormData({
                              ...formData,
                              addendums: newAddendums
                            });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newAddendums = [...(formData.addendums || [])];
                        const newSupported = [...(addendum.supportScope?.supported || []), ''];
                        newAddendums[index] = { 
                          ...addendum, 
                          supportScope: { 
                            ...addendum.supportScope!, 
                            supported: newSupported 
                          } 
                        };
                        setFormData({
                          ...formData,
                          addendums: newAddendums
                        });
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      + Add Supported Item
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Not Supported Items</label>
                  <div className="space-y-2">
                    {addendum.supportScope?.notSupported?.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newAddendums = [...(formData.addendums || [])];
                            const newNotSupported = [...(addendum.supportScope?.notSupported || [])];
                            newNotSupported[itemIndex] = e.target.value;
                            newAddendums[index] = { 
                              ...addendum, 
                              supportScope: { 
                                ...addendum.supportScope!, 
                                notSupported: newNotSupported 
                              } 
                            };
                            setFormData({
                              ...formData,
                              addendums: newAddendums
                            });
                          }}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder={`Not supported item ${itemIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newAddendums = [...(formData.addendums || [])];
                            const newNotSupported = addendum.supportScope?.notSupported?.filter((_, i) => i !== itemIndex) || [];
                            newAddendums[index] = { 
                              ...addendum, 
                              supportScope: { 
                                ...addendum.supportScope!, 
                                notSupported: newNotSupported 
                              } 
                            };
                            setFormData({
                              ...formData,
                              addendums: newAddendums
                            });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newAddendums = [...(formData.addendums || [])];
                        const newNotSupported = [...(addendum.supportScope?.notSupported || []), ''];
                        newAddendums[index] = { 
                          ...addendum, 
                          supportScope: { 
                            ...addendum.supportScope!, 
                            notSupported: newNotSupported 
                          } 
                        };
                        setFormData({
                          ...formData,
                          addendums: newAddendums
                        });
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      + Add Not Supported Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => {
            const newAddendums = [...(formData.addendums || []), {
              title: '',
              content: '',
              risks: [],
              mitigations: [],
              supportScope: {
                supported: [],
                notSupported: []
              }
            }];
            setFormData({
              ...formData,
              addendums: newAddendums
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Addendum
        </button>
      </div>
    </section>
  );
} 