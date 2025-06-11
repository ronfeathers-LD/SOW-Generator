import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWScopePage from '@/components/sow/SOWScopePage';

interface ClientRole {
  role: string;
  responsibilities: string[];
  name: string;
  email: string;
}

interface SOW {
  id: string;
  clientName: string;
  sowTitle: string;
  effectiveDate: Date;
  clientTitle: string;
  clientEmail: string;
  signatureDate: Date;
  projectDescription: string;
  deliverables: string[];
  startDate: Date;
  duration: string;
  clientRoles: ClientRole[];
  status: string;
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    billing: {
      companyName: string;
      billingContact: string;
      billingAddress: string;
      billingEmail: string;
      poNumber: string;
      paymentTerms: string;
      currency: string;
    };
  };
  accessRequirements: string;
  travelRequirements: string;
  workingHours: string;
  testingResponsibilities: string;
  addendums: Array<{
    title: string;
    description: string;
    date: string;
  }>;
  version: number;
  companyLogo: string;
  leandataName: string;
  leandataTitle: string;
  leandataEmail: string;
  clientSignerName: string;
}

export default async function SOWPDFPage({ params }: { params: { id: string } }) {
  const sow = await prisma.sOW.findUnique({
    where: { id: params.id },
  });

  if (!sow) {
    notFound();
  }

  // Parse/transform fields as needed
  const deliverables = typeof sow.deliverables === 'string'
    ? sow.deliverables.split('\n').filter(Boolean)
    : [];
  const clientRoles = Array.isArray(sow.clientRoles)
    ? sow.clientRoles
    : [];
  const pricingRoles = Array.isArray(sow.pricingRoles)
    ? sow.pricingRoles
    : [];
  const billing = (sow.billingInfo || {}) as any;
  const assumptions = [
    "LeanData Professional Services will require access to the customer's SFDC's sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.",
    "For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.",
    "If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.",
    "All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.",
    "Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations."
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Page */}
        <SOWTitlePage
          clientName={sow.clientName}
          clientLogo={sow.companyLogo}
          clientSignature={{
            name: sow.clientSignerName,
            title: sow.clientTitle,
            email: sow.clientEmail,
            date: sow.signatureDate.toISOString(),
          }}
          leandataSignature={{
            name: sow.leandataName,
            title: sow.leandataTitle,
            email: sow.leandataEmail,
          }}
        />

        {/* Introduction */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">INTRODUCTION</h2>
          <SOWIntroPage clientName={sow.clientName} />
        </div>

        {/* Scope */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">SCOPE</h2>
          <SOWScopePage deliverables={deliverables} />
        </div>

        {/* Roles and Responsibilities */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">ROLES AND RESPONSIBILITIES</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">Responsibilities</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Example static rows, replace with dynamic if needed */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Account Executive</td>
                  <td className="px-6 py-4 text-sm text-gray-700">Point of contact for account-level needs and services expansion. Liaison to facilitate meetings and project manage services/artifacts</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Project Manager</td>
                  <td className="px-6 py-4 text-sm text-gray-700">Manage timelines, project risk and communications, track and resolve issues</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Solution Engineer</td>
                  <td className="px-6 py-4 text-sm text-gray-700">Develop custom code, if any, to fulfill the requirements. Certified LeanData Consultant.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">PRICING</h2>
          <p className="mb-4 text-center">
            The tasks above will be completed on a time and material basis, using the LeanData standard workday of 8 hours for a duration of {sow.duration || 'N/A'}.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">LeanData Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rate/Hr</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total USD</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(pricingRoles) && pricingRoles.map((role: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{role.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${role.ratePerHour?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{role.totalHours}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{role.ratePerHour && role.totalHours ? (role.ratePerHour * role.totalHours).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mb-2 text-sm text-gray-700">LeanData shall notify Customer when costs are projected to exceed this estimate, providing the opportunity for Customer and LeanData to resolve jointly how to proceed. Hours listed above are to be consumed by the end date and cannot be extended.</p>
          <p className="mb-2 text-sm text-gray-700">Any additional requests or mutually agreed-upon additional hours required to complete the tasks shall be documented in a change order Exhibit to this SOW and signed by both parties. <span className="font-bold">Additional hours will be billed at the Rate/Hr.</span></p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-8 text-sm">
            <dt className="font-semibold">Company Name:</dt>
            <dd>{billing.companyName || 'N/A'}</dd>
            <dt className="font-semibold">Billing Contact Name:</dt>
            <dd>{billing.billingContact || 'N/A'}</dd>
            <dt className="font-semibold">Billing Address:</dt>
            <dd>
              {(billing.billingAddress || 'N/A')
                .split(',')
                .map((line: string, idx: number) => (
                  <span key={idx} className="block">{line.trim()}</span>
                ))}
            </dd>
            <dt className="font-semibold">Billing Email:</dt>
            <dd>{billing.billingEmail || 'N/A'}</dd>
            <dt className="font-semibold">Purchase Order Number:</dt>
            <dd>{billing.poNumber || 'PO provided by customer'}</dd>
            <dt className="font-semibold">Payment Terms:</dt>
            <dd>{billing.paymentTerms || 'N/A'}</dd>
            <dt className="font-semibold">Currency:</dt>
            <dd>{billing.currency || 'N/A'}</dd>
          </dl>
        </div>

        {/* Assumptions */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">ASSUMPTIONS</h2>
          <p className="mb-4">The following are the assumptions as part of the SOW:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            {assumptions.map((assumption, idx) => (
              <li key={idx}>{assumption}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 