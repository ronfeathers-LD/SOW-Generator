'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function HelpPage() {
  // Mark that user has seen the help page
  useEffect(() => {
    const markHelpSeen = async () => {
      try {
        await fetch('/api/users/mark-help-seen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Failed to mark help page as seen:', error);
      }
    };

    markHelpSeen();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How To Use This App</h1>
          <p className="text-lg text-gray-600 mb-8">
            A comprehensive guide to creating Statements of Work (SOWs) efficiently and accurately.
          </p>

          {/* Table of Contents */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-900 mb-4">Quick Navigation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <a href="#getting-started" className="text-green-700 hover:text-green-900">Getting Started</a>
              <a href="#salesforce-integration" className="text-green-700 hover:text-green-900">Salesforce Integration</a>
              <a href="#sow-creation" className="text-green-700 hover:text-green-900">SOW Creation Process</a>
              <a href="#product-selection" className="text-green-700 hover:text-green-900">Product Selection</a>
              <a href="#pricing-calculation" className="text-green-700 hover:text-green-900">Pricing Calculator</a>
              <a href="#avoma-integration" className="text-green-700 hover:text-green-900">Avoma Integration</a>
              <a href="#google-drive" className="text-green-700 hover:text-green-900">Google Drive Integration</a>
              <a href="#review-approval" className="text-green-700 hover:text-green-900">Review & Approval</a>
            </div>
          </div>

          {/* Getting Started */}
          <section id="getting-started" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🚀 Getting Started</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                This application helps you create professional Statements of Work (SOWs) for LeanData projects. 
                Follow these steps to get the most out of the system:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li><strong>Connect to Salesforce:</strong> Link each SOW to an active Salesforce Opportunity to automatically populate customer and opportunity data</li>
                <li><strong>Select Products:</strong> Choose the LeanData products your customer needs</li>
                <li><strong>Configure Details:</strong> Set up project scope, timeline, and deliverables</li>
                <li><strong>Calculate Pricing:</strong> Use the built-in pricing calculator for accurate estimates</li>
                <li><strong>Review & Approve:</strong> Finalize your SOW and get stakeholder approval</li>
              </ol>
            </div>
          </section>

          {/* Salesforce Integration */}
          <section id="salesforce-integration" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔗 Salesforce Integration</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Each SOW should be connected to an active Salesforce Opportunity. This automatically populates customer and opportunity data, saving you time and ensuring accuracy.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-2">How to Connect Each SOW to Salesforce:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Click <strong>&ldquo;Create New SOW&rdquo;</strong> from the dashboard</li>
                <li>Use the Salesforce search to find the customer account</li>
                <li>Select the relevant Salesforce Account and Opportunity</li>
                <li>Customer and opportunity data will be automatically populated</li>
                <li>Verify the data is accurate and current</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">What Data Gets Pulled:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>Account Information:</strong> Company name, billing address, contact details</li>
                <li><strong>Opportunity Data:</strong> Deal amount, stage, close date, description</li>
                <li><strong>Contact Information:</strong> Decision makers, technical contacts, billing contacts</li>
                <li><strong>Account Segment:</strong> Used for pricing calculations (Enterprise, Mid-Market, SMB)</li>
              </ul>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  <strong>💡 Tip:</strong> Always connect your SOW to an active Salesforce Opportunity and verify the pulled data is current and accurate before finalizing your SOW.
                </p>
              </div>
            </div>
          </section>

          {/* SOW Creation Process */}
          <section id="sow-creation" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📝 SOW Creation Process</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Creating a SOW involves several key steps. Follow this process for best results:
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 1: Basic Information</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Enter or verify customer company name</li>
                <li>Set project title and description</li>
                <li>Select project timeline and duration</li>
                <li>Add any special requirements or constraints</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 2: Product Configuration</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Select LeanData products needed</li>
                <li>Configure product-specific settings (units, regions, etc.)</li>
                <li>Set up user counts and consumption estimates</li>
                <li>Add any custom integrations or requirements</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 3: AI-Powered Scope Definition</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-800 mb-2">✨ The Magic of AI Analysis</h4>
                <p className="text-green-700 text-sm mb-3">
                  Our AI analyzes your Avoma call transcriptions and scoping documents to automatically generate:
                </p>
                <ul className="list-disc list-inside space-y-1 text-green-700 text-sm">
                  <li><strong>Project Objectives:</strong> Extracted from customer pain points and goals discussed</li>
                  <li><strong>Solution Deliverables:</strong> Organized by LeanData product with specific implementation details</li>
                  <li><strong>Overcoming Actions:</strong> Concrete steps to address customer challenges</li>
                  <li><strong>Project Overview:</strong> Professional summary for executive stakeholders</li>
                </ul>
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Upload Avoma call recordings or scoping documents</li>
                <li>Let AI analyze and extract key project details</li>
                <li>Review and refine the AI-generated content</li>
                <li>Add any additional objectives or deliverables manually</li>
              </ul>
            </div>
          </section>

          {/* Product Selection */}
          <section id="product-selection" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎯 Product Selection</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Accurately selecting the products requested by the customer is crucial for creating precise SOWs. The products you choose directly impact pricing, timeline, and project scope.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Why Product Selection Matters</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li><strong>Pricing Accuracy:</strong> Each product has specific pricing tiers and unit calculations</li>
                  <li><strong>Timeline Impact:</strong> Different products require different implementation phases</li>
                  <li><strong>Resource Planning:</strong> Product selection determines team assignments and expertise needed</li>
                  <li><strong>Customer Expectations:</strong> Incorrect products lead to scope creep and project delays</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Best Practices</h3>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>Review customer requirements carefully before selecting products</li>
                  <li>Use the AI analysis to identify products mentioned in scoping calls</li>
                  <li>Consider product dependencies (e.g., BookIt Handoff often needs SmartRep)</li>
                  <li>Verify selections with the customer before finalizing the SOW</li>
                </ul>
              </div>

            </div>
          </section>

          {/* Pricing Calculator */}
          <section id="pricing-calculation" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">💰 Pricing Calculator</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                The pricing calculator automatically calculates project hours and costs based on your product selection and configuration.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">How It Works:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Product Hours:</strong> Each product has a base hour requirement</li>
                <li><strong>User Groups:</strong> Additional hours for every 50 users/units</li>
                <li><strong>Project Manager:</strong> 45% of total hours (minimum 10 hours)</li>
                <li><strong>Account Segment:</strong> Different rates for Enterprise vs Mid-Market vs SMB</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Hour Calculation Rules:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Routing Products:</strong> First = 15 hours, Additional = 5 hours each</li>
                  <li><strong>Lead to Account Matching:</strong> 15 hours (only if single product)</li>
                  <li><strong>BookIt for Forms:</strong> 10 hours</li>
                  <li><strong>BookIt Handoff with SmartRep:</strong> +5 hours (requires Forms)</li>
                  <li><strong>BookIt Links/Handoff:</strong> 1 hour each</li>
                  <li><strong>User Groups:</strong> 5 hours per 50 users/endpoints</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  <strong>✅ Always Use:</strong> The pricing calculator ensures consistent, accurate pricing across all SOWs.
                </p>
              </div>
            </div>
          </section>

          {/* Avoma Integration */}
          <section id="avoma-integration" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎙️ Avoma Integration</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Avoma integration helps you extract key information from customer calls to create more accurate SOWs.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">How to Use Avoma:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Enter the customer name in your SOW</li>
                <li>Click <strong>&ldquo;Search for Scoping Calls&rdquo;</strong> in the Objectives tab</li>
                <li>The system will find relevant Avoma recordings</li>
                <li>AI will analyze transcripts and generate objectives</li>
                <li>Review and refine the generated content</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">What Gets Generated:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>Project Objectives:</strong> Key goals and outcomes</li>
                <li><strong>Deliverables:</strong> Specific items to be delivered</li>
                <li><strong>Requirements:</strong> Technical and business requirements</li>
                <li><strong>Assumptions:</strong> Project assumptions and dependencies</li>
                <li><strong>Timeline:</strong> Key milestones and deadlines</li>
              </ul>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800">
                  <strong>🎯 Best Practice:</strong> Always review and customize AI-generated content to match your specific project needs.
                </p>
              </div>
            </div>
          </section>

          {/* Google Drive Integration */}
          <section id="google-drive" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📁 Google Drive Integration</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Google Drive integration allows you to include relevant documents in your SOW analysis.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Supported Documents:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Google Docs (text documents)</li>
                <li>Google Sheets (spreadsheets)</li>
                <li>PDF files</li>
                <li>Microsoft Word documents</li>
                <li>Microsoft Excel spreadsheets</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">How to Use:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Connect your Google Drive account</li>
                <li>Search for documents by customer name</li>
                <li>Select relevant documents to include</li>
                <li>Documents are analyzed alongside Avoma transcripts</li>
                <li>AI generates comprehensive project insights</li>
              </ol>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800">
                  <strong>⚠️ Note:</strong> The app searches your connected Google Drive account. Only documents you have permission to view will be accessible.
                </p>
              </div>
            </div>
          </section>

          {/* Review & Approval */}
          <section id="review-approval" className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">✅ Review & Approval</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Before finalizing your SOW, follow this review process to ensure accuracy and completeness.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Pre-Submission Checklist:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>☐ <strong>Customer Information:</strong> Verify company name, address, and contact details</li>
                  <li>☐ <strong>Product Selection:</strong> Confirm all required products are selected</li>
                  <li>☐ <strong>Pricing:</strong> Review calculated hours and costs</li>
                  <li>☐ <strong>Timeline:</strong> Ensure project duration is realistic</li>
                  <li>☐ <strong>Scope:</strong> Verify objectives and deliverables are clear</li>
                  <li>☐ <strong>Assumptions:</strong> Document all project assumptions</li>
                  <li>☐ <strong>Roles:</strong> Define client and LeanData responsibilities</li>
                  <li>☐ <strong>Signatures:</strong> Ensure all required signatories are included</li>
                </ul>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Approval Workflow:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li><strong>Internal Review:</strong> Have a colleague review for accuracy</li>
                <li><strong>Manager Approval:</strong> Get manager sign-off on pricing and scope</li>
                <li><strong>Legal Review:</strong> Ensure terms and conditions are appropriate</li>
                <li><strong>Client Presentation:</strong> Present SOW to client for approval</li>
                <li><strong>Final Signatures:</strong> Collect all required signatures</li>
              </ol>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  <strong>🚨 Important:</strong> Never submit a SOW without proper internal review and approval.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔧 Troubleshooting</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Common Issues</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li><strong>Salesforce not connecting:</strong> Check credentials and permissions</li>
                    <li><strong>Pricing seems wrong:</strong> Verify product selection and user counts</li>
                    <li><strong>Avoma not finding calls:</strong> Ensure customer name matches exactly</li>
                    <li><strong>Google Drive access denied:</strong> Check sharing permissions</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Getting Help</h3>
                  <p className="text-sm text-gray-700">
                    If you have issues using this app, whether it is Technical Issues, Process Questions, Salesforce Issues, or Avoma Problems, please contact <a href="mailto:ron.feathers@leandata.com?subject=SOW Generator Question" className="text-green-600 hover:text-green-800 underline">Ron Feathers</a>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-8 mt-12">
            <div className="text-center">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
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
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
