'use client';

import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWOutOfScopePage from '@/components/sow/SOWOutOfScopePage';
import SOWProjectPhasesPage from '@/components/sow/SOWProjectPhasesPage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import PricingDisplay from '@/components/sow/PricingDisplay';
import { DisplaySOW, Product, SalesforceData } from '@/types/sow-display';
import { getPricingSummary } from '@/lib/sow/pricing-summary';

interface SOWPrintViewProps {
  sow: DisplaySOW;
  salesforceData: SalesforceData | null;
  products: Product[];
  showPricing: boolean;
  className: string;
}

/**
 * Print-mode rendering of a SOW (the `mode === 'print'` path of SOWDisplay).
 * Pure presentation of an already-loaded DisplaySOW — used by /print-sow/[id]
 * and as the PDF source. Extracted verbatim from SOWDisplay (#68 slice 4).
 */
export default function SOWPrintView({ sow, salesforceData, products, showPricing, className }: SOWPrintViewProps) {
  const pmIncluded = getPricingSummary(sow.pricingRoles).pmIncluded;
  return (
      <div className={`min-h-screen bg-white print:bg-white ${className}`}>
        <div className="print-layout">
          {/* Print view content will be rendered here */}
          <div id="title-page" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid print:min-h-screen print:flex print:flex-col print:justify-center">
            <SOWTitlePage 
              title={sow.sowTitle || 'SOW Title Not Available'}
              clientName={salesforceData?.account_data?.name || sow.clientName || 'Client Name Not Available'}
              companyLogo={sow.companyLogo}
              clientSignature={{
                name: sow.clientSignerName || 'Not Entered',
                title: sow.clientTitle || 'Title Not Entered',
                email: sow.clientEmail || 'Email Not Entered',
                date: sow.signatureDate || ''
              }}
              clientSignature2={sow.customer_signature_name_2 ? {
                name: sow.customer_signature_name_2,
                title: sow.customer_signature_2 || '',
                email: sow.customer_email_2 || '',
                date: ''
              } : undefined}
              leanDataSignature={sow.template?.lean_data_name && 
                                 sow.template?.lean_data_title && 
                                 sow.template?.lean_data_email &&
                                 sow.template.lean_data_name.trim() !== 'None Selected' &&
                                 sow.template.lean_data_title.trim() !== 'None Selected' &&
                                 sow.template.lean_data_email.trim() !== 'None Selected' ? {
                name: sow.template.lean_data_name,
                title: sow.template.lean_data_title,
                email: sow.template.lean_data_email
              } : {
                name: 'None Selected',
                title: 'None Selected',
                email: 'None Selected'
              }}
            />
          </div>
          {/* SOW Intro Section */}
          <div id="sow-intro" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
            <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
            <SOWIntroPage 
              clientName={salesforceData?.account_data?.name || sow.clientName || 'Client'}
              customContent={sow.custom_intro_content}
              isEdited={sow.intro_content_edited || false}
            />
          </div>

          {/* Objectives Section */}
          <div id="objectives" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
            <h2 className="text-3xl font-bold mb-6">1. OBJECTIVE</h2>
            <SOWObjectivesPage 
              deliverables={sow.deliverables || []}
              keyObjectives={sow.keyObjectives || []}
              projectDescription={sow.projectDescription || ''}
              customContent={sow.custom_objectives_disclosure_content}
              customKeyObjectivesContent={sow.custom_key_objectives_content}
              customDeliverablesContent={sow.custom_deliverables_content}
              deliverablesEdited={sow.deliverables_content_edited || false}
              keyObjectivesEdited={sow.key_objectives_content_edited || false}
              isEdited={sow.objectives_disclosure_content_edited || false}
              products={products}
              projectDetails={{
                products: sow.products || [],
                number_of_units: sow.number_of_units || '',
                regions: sow.regions || '',
                salesforce_tenants: sow.salesforce_tenants || '',
                timeline_weeks: sow.timeline_weeks || '',
                start_date: sow.startDate ? new Date(sow.startDate) : new Date(),
                end_date: null,
                units_consumption: sow.units_consumption || '',
                orchestration_units: sow.orchestration_units || '',
                bookit_forms_units: sow.bookit_forms_units || '',
                bookit_links_units: sow.bookit_links_units || '',
                bookit_handoff_units: sow.bookit_handoff_units || ''
              }}
            />
          </div>

          {/* Scope Section */}
          <div id="scope" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
            <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
            <SOWScopePage 
              customContent={sow.custom_scope_content}
              customDeliverablesContent={sow.custom_deliverables_content}
              isEdited={sow.scope_content_edited || false}
            />
            
            {/* Out of Scope Section */}
            <div className="mt-8">
              <SOWOutOfScopePage 
                customContent={sow.custom_out_of_scope_content}
                isEdited={sow.out_of_scope_content_edited || false}
              />
            </div>
          </div>

          {/* Project Phases Section */}
          <div id="project-phases" className="formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
            <h2 className="text-3xl font-bold mb-6">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
            <SOWProjectPhasesPage 
              customContent={sow.custom_project_phases_content}
              isEdited={sow.project_phases_content_edited || false}
            />
          </div>

                    {/* Roles Section */}
          <div id="roles" className="formatSOWTable mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">                                    
            <h2 className="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>                                                                          
            
            {/* Project Team Roles */}
            {Array.isArray(sow.pricingRoles) && sow.pricingRoles.length > 0 && (() => {
              // Filter out Account Executive; PM row absent from table when removed (table-derived)
              const filteredRoles = sow.pricingRoles.filter((role: unknown) => {
                const roleData = role as Record<string, unknown>;
                const roleName = String(roleData.role || '');
                // Always exclude Account Executive
                if (roleName === 'Account Executive') {
                  return false;
                }
                return true;
              });

              return filteredRoles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Team Roles</h3>                                                                
                  <div className="overflow-x-auto formatSOWTable">
                    <table>
                      <thead>
                        <tr>
                          <th>LeanData Role</th>
                          <th>Responsibilities</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRoles.map((role: unknown, idx) => {
                          const roleData = role as Record<string, unknown>;
                          return (
                            <tr key={idx}>
                              <td>{String(roleData.role || 'N/A')}</td>
                              <td>
                                <div className="whitespace-pre-line">{String(roleData.description || 'No description provided')}</div>                            
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            
            {/* Display Client Roles if they exist */}
            {sow.clientRoles && Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Client Roles</h3>
                <div className="overflow-x-auto formatSOWTable">
                  <table>
                    <thead>
                      <tr>
                        <th>{salesforceData?.account_data?.name || sow.clientName || 'Client'} Role</th>
                        <th>Contact</th>
                        <th>Responsibilities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sow.clientRoles.map((role: { role?: string; contact_title?: string; name?: string; email?: string; responsibilities?: string }, idx: number) => (
                        <tr key={idx}>
                          <td>{role.role || role.contact_title || 'N/A'}</td>
                          <td>
                            <div>
                              <div className="font-medium">{role.name || 'N/A'}</div>
                              {role.email && (
                                <div className="text-sm text-gray-500">{role.email}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="whitespace-pre-wrap max-w-md">
                              {role.responsibilities || ''}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          {showPricing && (
            <div id="pricing" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
              <h2 className="text-3xl font-bold mb-6">5. PRICING</h2>
              
              {/* Project Timeline Display */}
              {sow.timeline_weeks && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                  <div className="formatSOWTable">
                    <table>
                      <thead>
                        <tr>
                          <th>Phase</th>
                          <th>Description</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const totalWeeks = parseFloat(sow.timeline_weeks) || 0;
                          
                          const formatDuration = (weeks: number) => {
                            if (weeks < 1) {
                              const days = Math.ceil(weeks * 7);
                              return `${days} ${days === 1 ? 'day' : 'days'}`;
                            } else {
                              const roundedWeeks = Math.round(weeks * 10) / 10;
                              return `${roundedWeeks} ${roundedWeeks === 1 ? 'week' : 'weeks'}`;
                            }
                          };
                          
                          const phaseDurations = {
                            engage: 0.125, discovery: 0.25, build: 0.25, 
                            test: 0.125, deploy: 0.125, hypercare: 0.125
                          };
                          
                          const phases = [
                            { name: 'ENGAGE', description: 'Project kickoff and planning', duration: totalWeeks * phaseDurations.engage },
                            { name: 'DISCOVERY', description: 'Requirements gathering and analysis', duration: totalWeeks * phaseDurations.discovery },
                            { name: 'BUILD', description: 'Solution development and configuration', duration: totalWeeks * phaseDurations.build },
                            { name: 'TEST', description: 'Quality assurance and validation', duration: totalWeeks * phaseDurations.test },
                            { name: 'DEPLOY', description: 'Production deployment and go-live', duration: totalWeeks * phaseDurations.deploy },
                            { name: 'HYPERCARE', description: 'Post-deployment support and transition', duration: totalWeeks * phaseDurations.hypercare }
                          ];
                          
                          return phases.map((phase, index) => (
                            <tr key={phase.name}>
                              <td>{index + 1}. {phase.name}</td>
                              <td>{phase.description}</td>
                              <td>{formatDuration(phase.duration)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                <p className="text-gray-700">
                  The tasks above will be completed on a <strong>time and material basis</strong>, using the LeanData standard workday of 8 hours for a duration of <strong>{sow.timeline_weeks ? (() => {
                    const totalWeeks = parseFloat(sow.timeline_weeks) || 0;
                    if (totalWeeks < 1) {
                      const days = Math.ceil(totalWeeks * 7);
                      return `${days} ${days === 1 ? 'day' : 'days'}`;
                    } else {
                      return `${totalWeeks} weeks`;
                    }
                  })() : 'N/A'}</strong>.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Hours are calculated based on product selection and unit counts, with automatic role assignment and project management inclusion where applicable.
                </p>
              </div>

              {/* Pricing Display Component */}
              <PricingDisplay
                pricingRoles={Array.isArray(sow.pricingRoles) ? sow.pricingRoles.map((role: unknown) => {
                  const roleData = role as Record<string, unknown>;
                  return {
                    role: String(roleData.role || ''),
                    description: String(roleData.description || ''),
                    ratePerHour: Number(roleData.ratePerHour) || Number(roleData.rate_per_hour) || 0,
                    defaultRate: Number(roleData.defaultRate) || Number(roleData.default_rate) || 0,
                    totalHours: Number(roleData.totalHours) || Number(roleData.total_hours) || 0,
                    totalCost: (Number(roleData.ratePerHour) || Number(roleData.rate_per_hour) || 0) * (Number(roleData.totalHours) || Number(roleData.total_hours) || 0)
                  };
                }) : []}
                discountType={sow.pricing?.discount_type || 'none'}
                discountAmount={sow.pricing?.discount_amount || 0}
                discountPercentage={sow.pricing?.discount_percentage || 0}
                subtotal={sow.pricing?.subtotal || 0}
                totalAmount={sow.pricing?.total_amount || 0}
                lastCalculated={sow.pricing?.last_calculated || null}
                pmHoursRemoved={!pmIncluded}
                isPrintMode={true}
              />

              <p className="mb-2 text-sm text-gray-700">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
              <p className="mb-2 text-sm text-gray-700">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
              
              {/* Billing Information */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
                  {sow.salesforceAccountId && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      From Salesforce
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <dt className="font-semibold text-gray-700">Company Name:</dt>
                  <dd className="text-gray-900">{sow.template?.billing_company_name || 'N/A'}</dd>
                  
                  <dt className="font-semibold text-gray-700">Billing Contact Name:</dt>
                  <dd className="text-gray-900">{sow.template?.billing_contact_name || 'N/A'}</dd>
                  
                  <dt className="font-semibold text-gray-700">Billing Address:</dt>
                  <dd className="text-gray-900">
                    {(sow.template?.billing_address || 'N/A')
                      .split(',')
                      .map((line: string, idx: number) => (
                        <span key={idx} className="block">{line.trim()}</span>
                      ))}
                  </dd>
                  
                  <dt className="font-semibold text-gray-700">Billing Email:</dt>
                  <dd className="text-gray-900">{sow.template?.billing_email || 'N/A'}</dd>
                  
                  <dt className="font-semibold text-gray-700">Purchase Order Number:</dt>
                  <dd className="text-gray-900">{sow.template?.purchase_order_number || 'N/A'}</dd>
                  
                  {/* TODO: Wire this in the future when we have a way to read the terms from SFDC 
                  <dt className="font-semibold text-gray-700">Payment Terms:</dt>
                  <dd className="text-gray-900">Net 30</dd>
                  
                  
                  <dt className="font-semibold text-gray-700">Currency:</dt>
                  <dd className="text-gray-900">USD</dd>
                  */ }
                </dl>
                
                {/* TODO: Wire this in the future when we have a way to determine the billing cycle 
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Payment Terms:</strong> Net 30 • 
                    <strong>Currency:</strong> USD • 
                    <strong>Billing Cycle:</strong> Monthly or upon completion of major milestones
                  </p>
                </div>
                */}
              </div>
            </div>
          )}

          {/* Assumptions Section */}
          <div id="assumptions" className="mb-12 print:mb-8 page-break-inside-avoid print:page-break-inside-avoid">
            <h2 className="text-3xl font-bold mb-6">6. ASSUMPTIONS</h2>
            <SOWAssumptionsPage 
              customContent={sow.custom_assumptions_content}
              isEdited={sow.assumptions_content_edited || false}
            />
          </div>

          {/* AI Generation Disclaimer */}
          <div className="mt-12 print:mt-8 pt-8 print:pt-6 border-t-2 border-gray-300 print:border-gray-300 bg-gray-50 print:bg-gray-50 px-6 print:px-6 py-4 print:py-4">
            <p className="text-xs print:text-xs text-gray-600 print:text-gray-600 text-center print:text-center italic print:italic leading-relaxed print:leading-relaxed">
              <strong>Note:</strong> This Statement of Work was generated with the assistance of artificial intelligence. 
              While we strive for accuracy, please review all details carefully as there may be minor errors or inconsistencies. 
              If you notice any discrepancies, please contact us immediately.
            </p>
          </div>
        </div>
      </div>
  );
}
