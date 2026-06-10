'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWOutOfScopePage from '@/components/sow/SOWOutOfScopePage';
import SOWProjectPhasesPage from '@/components/sow/SOWProjectPhasesPage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import PricingDisplay from '@/components/sow/PricingDisplay';
import MultiStepApprovalWorkflow from '@/components/sow/MultiStepApprovalWorkflow';
import SOWComments from '@/components/sow/SOWComments';
import SaveToGoogleDrive from '@/components/sow/SaveToGoogleDrive';
import LoadingModal from '@/components/ui/LoadingModal';
import CreateRevisionButton from '@/components/sow/CreateRevisionButton';
import SOWRevisionHistory from '@/components/sow/SOWRevisionHistory';
import ValidationSubmitButton from '@/components/sow/ValidationSubmitButton';
import AnchoredCommentButton from '@/components/sow/AnchoredCommentButton';
import AnchoredCommentComposer from '@/components/sow/AnchoredCommentComposer';
import { useTextSelection } from '@/lib/hooks/useTextSelection';
import type { SelectionAnchor } from '@/lib/selection-anchor';
import type { SOWSectionKey } from '@/lib/sow-content';
import { DisplaySOW, Product, SalesforceData } from '@/types/sow-display';

// Helper function to find the appropriate signatory from Salesforce contacts
function findSignatory(contacts: SalesforceData['contacts_data']): { name: string; title: string; email: string } | null {
  if (!contacts || contacts.length === 0) return null;

  const decisionMaker = contacts.find(contact => contact.role === 'decision_maker');
  if (decisionMaker) {
    return {
      name: `${decisionMaker.first_name || ''} ${decisionMaker.last_name}`.trim(),
      title: decisionMaker.title || '',
      email: decisionMaker.email || ''
    };
  }

  const primaryPoc = contacts.find(contact => contact.role === 'primary_poc');
  if (primaryPoc) {
    return {
      name: `${primaryPoc.first_name || ''} ${primaryPoc.last_name}`.trim(),
      title: primaryPoc.title || '',
      email: primaryPoc.email || ''
    };
  }

  const firstContact = contacts[0];
  return {
    name: `${firstContact.first_name || ''} ${firstContact.last_name}`.trim(),
    title: firstContact.title || '',
    email: firstContact.email || ''
  };
}

interface SOWFullViewProps {
  sow: DisplaySOW;
  salesforceData: SalesforceData | null;
  products: Product[];
  sowId: string;
  showActions: boolean;
  showComments: boolean;
  showPricing: boolean;
  showApproval: boolean;
  showVersionHistory: boolean;
  showGoogleDrive: boolean;
  className: string;
}

/**
 * Full (interactive) rendering of a SOW — the main /sow/[id] view: actions
 * (edit / PDF / print), the content document, and the Status / Revisions /
 * Comments tabs with the approval workflow and recall flow. Pure consumer of an
 * already-loaded DisplaySOW (data fetching lives in useSow). Extracted verbatim
 * from SOWDisplay (#68 slice 5).
 */
export default function SOWFullView({
  sow,
  salesforceData,
  products,
  sowId,
  showActions,
  showComments,
  showPricing,
  showApproval,
  showVersionHistory,
  showGoogleDrive,
  className,
}: SOWFullViewProps) {
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'generating' | 'downloading' | 'success' | 'error'>('idle');
  const [isRecalling, setIsRecalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'status' | 'revisions' | 'comments'>('content');

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const canApprove = isAdmin || isManager;
  const router = useRouter();

  // ── Anchored comments (#349): select text in a section → comment on it ──
  // Gating mirrors the Comments tab: available to ANY signed-in user whenever
  // comments are shown, regardless of SOW status (SOWComments is rendered
  // without a status check, so anchored comments follow the same rule).
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [composer, setComposer] = useState<{
    anchor: SelectionAnchor;
    sectionKey: SOWSectionKey;
    rect: DOMRect;
  } | null>(null);
  const canAnchorComment = showComments && !!session?.user;
  const { selection, clear: clearSelection } = useTextSelection(
    contentRef,
    canAnchorComment && activeTab === 'content' && !composer
  );

  const openComposer = useCallback(() => {
    if (!selection) return;
    setComposer({
      anchor: selection.anchor,
      sectionKey: selection.sectionKey,
      rect: selection.rect,
    });
    clearSelection();
  }, [selection, clearSelection]);

  const isEditable = useMemo(() => {
    if (!sow) return false;
    return sow.status === 'draft';
  }, [sow]);

  const canRecallSOW = useMemo(() => {
    if (!sow || sow.status !== 'in_review' || !session?.user) {
      return false;
    }

    const isAuthor = sow.author_id && sow.author_id === session.user.id;
    return (sow.is_latest ?? true) && (isAuthor || isManager || isAdmin);
  }, [sow, session?.user, isManager, isAdmin]);

  const handleRecall = useCallback(async () => {
    if (!sow) return;

    const confirmed = confirm(
      `Recall "${sow.sowTitle}" for ${sow.clientName || 'this client'}?\n\n` +
      'This will cancel the current review, mark this version as recalled, and create a new draft revision for further edits.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsRecalling(true);
      const response = await fetch(`/api/sow/${sow.id}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recall SOW');
      }

      const result = await response.json();
      alert(result.message || 'SOW recalled. A new draft revision has been created.');

      if (result.newRevisionId) {
        router.push(`/sow/${result.newRevisionId}/edit`);
      } else if (result.newRevision?.id) {
        router.push(`/sow/${result.newRevision.id}/edit`);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error recalling SOW:', error);
      const message = error instanceof Error ? error.message : 'Failed to recall SOW. Please try again.';
      alert(message);
    } finally {
      setIsRecalling(false);
    }
  }, [router, sow]);

    return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${className}`}>
      {sow && (
        <>
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">View SOW</h1>
            {showActions && (
              <div className="flex items-center space-x-3">
                {isEditable && (
                  <Link
                    href={`/sow/${sowId}/edit`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setDownloadingPDF(true);
                    setDownloadStatus('generating');
                    setShowDownloadModal(true);
                    
                    try {
                      const response = await fetch(`/api/sow/${sow.id}/pdf`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });

                      if (!response.ok) {
                        throw new Error('Failed to generate PDF');
                      }

                      setDownloadStatus('downloading');
                      
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${sow.sowTitle || 'SOW'} - ${sow.clientName || 'Client'}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      
                      setDownloadStatus('success');
                      
                      setTimeout(() => {
                        setShowDownloadModal(false);
                        setDownloadingPDF(false);
                        setDownloadStatus('idle');
                      }, 3000);
                      
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                      setDownloadStatus('error');
                      setDownloadingPDF(false);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Download PDF to your computer"
                  disabled={downloadingPDF}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <Link
                  href={`/print-sow/${sowId}`}
                  target="_blank"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Open SOW in print view"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print View
                </Link>
              </div>
            )}
          </div>

          {/* PM Hours Removed Notice */}
          {sow.pm_hours_requirement_disabled && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">PM Hours Removed:</span> Project Manager hours have been removed from this SOW. PM approval is not required in the approval workflow.
                    {sow.pm_hours_requirement_disabled_date && (
                      <span className="block mt-1 text-xs text-amber-600">
                        Removed on {new Date(sow.pm_hours_requirement_disabled_date).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {showActions && (
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`${
                    activeTab === 'content'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                >
                  Content
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`${
                    activeTab === 'status'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                >
                  Status & Approvals
                </button>
                {showVersionHistory && (
                  <button
                    onClick={() => setActiveTab('revisions')}
                    className={`${
                      activeTab === 'revisions'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                  >
                    Revisions
                  </button>
                )}
                {showComments && (
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`${
                      activeTab === 'comments'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                  >
                    Comments
                  </button>
                )}
              </nav>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'content' && (
            <div className="w-full">
              {/* Rejected Status Indicator - Subtle */}
              {sow.status === 'rejected' && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-300 rounded-r p-3">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">This revision was rejected</span>
                        {sow.rejected_at && (
                          <span className="text-red-600 ml-1">
                            on {new Date(sow.rejected_at).toLocaleDateString()}
                          </span>
                        )}
                        {sow.approval_comments && (
                          <span className="text-red-600 ml-1">• {sow.approval_comments}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div id="sow-content-to-export" ref={contentRef}>
                {/* Title Page Section */}
                <div id="title-page" className="mb-12">
                  <SOWTitlePage
                    title={sow.sowTitle || 'SOW Title Not Available'}
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    companyLogo={sow.companyLogo}
                    clientSignature={{
                      name: findSignatory(salesforceData?.contacts_data)?.name || sow.clientSignerName || sow.clientSignature?.name || 'Not Entered',
                      title: findSignatory(salesforceData?.contacts_data)?.title || sow.clientSignature?.title || sow.clientTitle || 'Title Not Entered',
                      email: findSignatory(salesforceData?.contacts_data)?.email || sow.clientSignature?.email || sow.clientEmail || 'Email Not Entered',
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

                {/* SOW Intro Page Section */}
                <div id="content-introduction" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
                  <SOWIntroPage 
                    clientName={salesforceData?.account_data?.name || sow.clientName}
                    customContent={sow.custom_intro_content}
                    isEdited={sow.intro_content_edited}
                  />
                </div>

                {/* SOW Objectives Page Section */}
                <div id="content-objectives" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">1. OBJECTIVE</h2>
                  <SOWObjectivesPage 
                    deliverables={sow.deliverables} 
                    keyObjectives={sow.keyObjectives}
                    projectDescription={sow.projectDescription}
                    customContent={sow.custom_objectives_disclosure_content}
                    customKeyObjectivesContent={sow.custom_key_objectives_content}
                    customDeliverablesContent={sow.custom_deliverables_content}
                    deliverablesEdited={sow.deliverables_content_edited}
                    keyObjectivesEdited={sow.key_objectives_content_edited}
                    isEdited={sow.objectives_disclosure_content_edited}
                    products={products}
                    projectDetails={{
                      products: sow.products || [],
                      number_of_units: sow.number_of_units || '',
                      regions: sow.regions || '',
                      salesforce_tenants: sow.salesforce_tenants || '',
                      timeline_weeks: sow.timeline_weeks || '',
                      start_date: new Date(sow.startDate),
                      end_date: null,
                      units_consumption: sow.units_consumption || '',
                      orchestration_units: sow.orchestration_units || '',
                      bookit_forms_units: sow.bookit_forms_units || '',
                      bookit_links_units: sow.bookit_links_units || '',
                      bookit_handoff_units: sow.bookit_handoff_units || ''
                    }}
                  />
                </div>

                {/* SOW Scope Page Section */}
                <div id="content-scope" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">2. SCOPE</h2>
                  <SOWScopePage 
                    customContent={sow.custom_scope_content}
                    customDeliverablesContent={sow.custom_deliverables_content}
                    isEdited={sow.scope_content_edited}
                  />

                  {/* SOW Out of Scope Page Section */}
                  <SOWOutOfScopePage 
                    customContent={sow.custom_out_of_scope_content}
                    isEdited={sow.out_of_scope_content_edited}
                  />
                </div>

                {/* SOW Project Phases Page Section */}
                <div id="content-project-phases" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">3. PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>
                  <div className="formatSOWTable">
                    <SOWProjectPhasesPage 
                      customContent={sow.custom_project_phases_content}
                      isEdited={sow.project_phases_content_edited}
                    />
                  </div>
                </div>

                                {/* Roles and Responsibilities Section */}
                <div id="content-roles" className="max-w-7xl mx-auto bg-white p-8 mb-12">                                                                       
                  <h2 className="text-3xl font-bold mb-6">4. ROLES AND RESPONSIBILITIES</h2>                                                                    
                  
                  {/* Project Team Roles */}
                  {Array.isArray(sow.pricingRoles) && sow.pricingRoles.length > 0 && (() => {
                    // Filter out Account Executive and Project Manager if PM hours are removed
                    const filteredRoles = sow.pricingRoles.filter((role: unknown) => {
                      const roleData = role as Record<string, unknown>;
                      const roleName = String(roleData.role || '');
                      // Always exclude Account Executive
                      if (roleName === 'Account Executive') {
                        return false;
                      }
                      // Exclude Project Manager if PM hours are removed
                      if (sow.pm_hours_requirement_disabled && roleName === 'Project Manager') {
                        return false;
                      }
                      return true;
                    });

                    return filteredRoles.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Team Roles</h3>                                                          
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg overflow-hidden">                               
                            <thead style={{backgroundColor: '#26D07C'}}>
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">LeanData Role</th>                      
                                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Responsibilities</th>                   
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredRoles.map((role: unknown, idx) => {
                                const roleData = role as Record<string, unknown>;
                                return (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 align-top">{String(roleData.role || 'N/A')}</td>       
                                    <td className="px-6 py-4 text-gray-700 align-top">                                                                            
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
                  
                  {/* Client Roles Table */}
                  {Array.isArray(sow.clientRoles) && sow.clientRoles.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Client Roles</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg overflow-hidden">
                          <thead style={{backgroundColor: '#26D07C'}}>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{sow.clientName || 'Client'} Role</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Contact</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Responsibilities</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sow.clientRoles.map((role, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-900">{role.role || role.contact_title || 'N/A'}</td>
                                <td className="px-6 py-4 text-gray-700">
                                  <div>
                                    <div className="font-medium">{role.name || 'N/A'}</div>
                                    {role.email && (
                                      <div className="text-sm text-gray-500">{role.email}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-gray-700">
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
                  <div id="content-pricing" className="max-w-7xl mx-auto bg-white p-8 mb-12">
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
                      pmHoursRemoved={sow.pm_hours_requirement_disabled || false}
                      isPrintMode={false}
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
                        */}
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
                <div id="content-assumptions" className="max-w-7xl mx-auto bg-white p-8 mb-12">
                  <h2 className="text-3xl font-bold mb-6">6. ASSUMPTIONS</h2>
                  <SOWAssumptionsPage 
                    customContent={sow.custom_assumptions_content}
                    isEdited={sow.assumptions_content_edited}
                  />
                </div>

                {/* AI Generation Disclaimer */}
                <div className="max-w-7xl mx-auto mt-8 pt-8 border-t-2 border-gray-300 bg-gray-50 px-6 py-4 mb-12">
                  <p className="text-xs text-gray-600 text-center italic leading-relaxed">
                    <strong>Note:</strong> This Statement of Work was generated with the assistance of artificial intelligence. 
                    While we strive for accuracy, please review all details carefully as there may be minor errors or inconsistencies. 
                    If you notice any discrepancies, please contact us immediately.
                  </p>
                </div>
              </div>

              {/* Anchored-comment selection UI (#349) — Content tab only;
                  never rendered on the /print-sow path (SOWPrintView). */}
              {canAnchorComment && selection && !composer && (
                <AnchoredCommentButton rect={selection.rect} onClick={openComposer} />
              )}
              {canAnchorComment && composer && (
                <AnchoredCommentComposer
                  sowId={sow.id}
                  sectionKey={composer.sectionKey}
                  anchor={composer.anchor}
                  rect={composer.rect}
                  onClose={() => setComposer(null)}
                  onPosted={() => {
                    // No explicit refetch needed: SOWComments mounts fresh
                    // (and reloads) every time the Comments tab is activated,
                    // so the new comment appears on the next tab switch.
                  }}
                />
              )}
            </div>
          )}

          {/* Status & Approvals Tab */}
          {activeTab === 'status' && showActions && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Status & Approvals</h2>
              
              <div className="space-y-6">
                {/* Current Status */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Status</h3>
                  
                  {sow.status === 'draft' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-700 mb-4">
                          This SOW is currently in <strong>draft</strong> status. Submit it for review when ready.
                        </p>
                        <ValidationSubmitButton sow={sow} />
                      </div>
                    </div>
                  )}
                  
                  {sow.status === 'in_review' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700 font-medium mb-2">
                          Status: <span className="font-bold">In Review</span>
                        </p>
                        {sow.submitted_at && (
                          <p className="text-sm text-blue-600">
                            Submitted on: {new Date(sow.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <MultiStepApprovalWorkflow
                        sowId={sow.id}
                        sowTitle={sow.sowTitle || 'Untitled SOW'}
                        clientName={sow.clientName || 'Unknown Client'}
                        showApproval={showApproval}
                        canApprove={canApprove}
                      />

                      {canRecallSOW && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Need to keep editing?
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Recalling cancels the current review, marks this version as recalled, and opens a new draft revision for updates before resubmitting.
                          </p>
                          <button
                            onClick={handleRecall}
                            disabled={isRecalling}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                              isRecalling
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                            }`}
                          >
                            {isRecalling ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Recalling...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7 7l-7-7 7-7" />
                                </svg>
                                Recall & Create Revision
                              </>
                            )}
                          </button>
                          <p className="mt-2 text-xs text-gray-500">
                            All outstanding approval requests will be cancelled. Approvers must review the new draft once it is resubmitted.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {sow.status === 'approved' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-lg font-medium text-green-800">SOW Approved</h3>
                        </div>
                        {sow.approved_at && (
                          <p className="text-sm text-green-700 mb-2">
                            Approved on: {new Date(sow.approved_at).toLocaleDateString()}
                          </p>
                        )}
                        {sow.approval_comments && (
                          <div className="bg-green-100 border border-green-300 rounded p-3 mt-3">
                            <p className="text-sm text-green-800">
                              <strong>Approval Comments:</strong> {sow.approval_comments}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions for Approved SOWs */}
                      <div className="border-t border-gray-200 pt-4 space-y-4">
                        <div>
                          <h4 className="text-md font-semibold text-gray-900 mb-3">Actions</h4>
                          
                          {/* Admin: Edit Pricing */}
                          {isAdmin && (
                            <div className="mb-4">
                              <Link
                                href={`/sow/${sow.id}/edit?tab=pricing`}
                                className="w-full inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Edit Pricing
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">
                                Admins can edit pricing and discounts on approved SOWs
                              </p>
                            </div>
                          )}

                          {/* Create Change Order */}
                          <div className="mb-4">
                            <button
                              onClick={() => {
                                window.location.href = `/change-orders?sowId=${sow.id}`;
                              }}
                              className="w-full bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                            >
                              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Create Change Order
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                              Document modifications to this approved SOW
                            </p>
                          </div>

                          {/* Google Drive Integration */}
                          {showGoogleDrive && (
                            <div>
                              <SaveToGoogleDrive 
                                sowId={sow.id}
                                customerName={sow.clientName || 'Unknown Customer'}
                                sowTitle={sow.sowTitle || 'Untitled SOW'}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {sow.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-lg font-medium text-red-800">SOW Rejected</h3>
                      </div>
                      <p className="text-red-700 mb-3">
                        This SOW has been rejected and requires revisions before it can be resubmitted.
                      </p>
                      {sow.rejected_at && (
                        <p className="text-sm text-red-600 mb-2">
                          <strong>Rejected on:</strong> {new Date(sow.rejected_at).toLocaleDateString()}
                        </p>
                      )}
                      {sow.approval_comments && (
                        <div className="bg-red-100 border border-red-300 rounded p-3 mt-3">
                          <p className="text-sm text-red-800">
                            <strong>Rejection Comments:</strong> {sow.approval_comments}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {sow.status === 'recalled' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11a1 1 0 01.707.293l6 6a1 1 0 01-1.414 1.414L13 11.414V21a1 1 0 11-2 0v-9.586L4.707 16.707A1 1 0 013.293 15.293l6-6A1 1 0 0110 9h11" />
                        </svg>
                        <h3 className="text-lg font-medium text-purple-800">SOW Recalled</h3>
                      </div>
                      <p className="text-purple-700 mb-3">
                        This version was recalled from the approval process. A new draft revision has been created for continued editing.
                      </p>
                      <p className="text-sm text-purple-600">
                        Switch to the latest version from the revision history to keep working on the draft before resubmitting.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Revisions Tab */}
          {activeTab === 'revisions' && showVersionHistory && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Revisions</h2>
                
                {/* Create New Revision Button (if applicable) */}
                {(sow.status === 'approved' || sow.status === 'rejected') && (
                  <div className="mb-6">
                    {sow.status === 'rejected' ? (
                      <CreateRevisionButton
                        sowId={sow.id}
                        sowTitle={sow.sowTitle || 'Untitled SOW'}
                        clientName={sow.clientName || 'Unknown Client'}
                      />
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/sow/${sow.id}/version`, {
                              method: 'POST'
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to create new version');
                            }
                            
                            const newVersion = await response.json();
                            window.location.href = `/sow/${newVersion.id}`;
                          } catch (err) {
                            console.error('Error creating new version:', err);
                            alert('Failed to create new version. Please try again.');
                          }
                        }}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mb-3"
                      >
                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create New Revision
                      </button>
                    )}
                  </div>
                )}

                {/* Revision History */}
                <SOWRevisionHistory 
                  sowId={sow.id} 
                  currentVersion={sow.version || 1}
                />
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && showComments && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments & Discussion</h2>
              <SOWComments sowId={sow.id} />
            </div>
          )}

        </>
      )}

      {/* PDF Download Modal */}
      <LoadingModal
        isOpen={showDownloadModal}
        title={
          downloadStatus === 'generating' ? 'Generating PDF...' :
          downloadStatus === 'downloading' ? 'Downloading PDF...' :
          downloadStatus === 'success' ? 'PDF Downloaded Successfully!' :
          downloadStatus === 'error' ? 'PDF Generation Failed' :
          'Processing...'
        }
        message={
          downloadStatus === 'generating' ? 'Creating your SOW document in PDF format. This may take a moment...' :
          downloadStatus === 'downloading' ? 'Your PDF is ready! Downloading now...' :
          downloadStatus === 'success' ? 'Your SOW PDF has been downloaded successfully.' :
          downloadStatus === 'error' ? 'There was an error generating the PDF. Please try again.' :
          'Please wait while we process your request...'
        }
        showSpinner={downloadStatus !== 'success'}
        operation="processing"
      />
    </div>
  );
}
