import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SOWTitlePage from '@/components/sow/SOWTitlePage';
import SOWIntroPage from '@/components/sow/SOWIntroPage';
import SOWScopePage from '@/components/sow/SOWScopePage';
import SOWObjectivesPage from '@/components/sow/SOWObjectivesPage';
import SOWAssumptionsPage from '@/components/sow/SOWAssumptionsPage';
import SOWRolesPage from '@/components/sow/SOWRolesPage';

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
  clientTitle: string;
  clientEmail: string;
  signatureDate: Date;
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

  version: number;
  companyLogo: string;
  leandata_name: string;
  leandata_title: string;
  leandata_email: string;
  clientSignerName: string;
  // Project Details
  products?: string[];
  number_of_units?: string;
  regions?: string;
  salesforce_tenants?: string;
  timeline_weeks?: string;
  project_start_date?: string;
  project_end_date?: string;
  units_consumption?: string;
  
  // Custom content tracking
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_assumptions_content?: string;
  custom_roles_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  roles_content_edited?: boolean;
}

export default async function SOWPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: sow, error } = await supabase
    .from('sows')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !sow) {
    notFound();
  }

  // Fetch products for this SOW
  const { data: sowProducts, error: productsError } = await supabase
    .from('sow_products')
    .select(`
      product_id,
      products (
        name
      )
    `)
    .eq('sow_id', sow.id);

  const productNames = sowProducts?.map(sp => (sp.products as any)?.name).filter(Boolean) || [];

  // Parse/transform fields as needed
  const deliverables = typeof sow.deliverables === 'string'
    ? sow.deliverables.split('\n').filter(Boolean)
    : [];
  const projectDescription = sow.project_description || '';
  const objectivesDescription = sow.objectives?.description || sow.project_description || '';
  const clientRoles = Array.isArray(sow.client_roles)
    ? sow.client_roles
    : [];
  const pricingRoles = Array.isArray(sow.pricing_roles)
    ? sow.pricing_roles
    : [];
  const billing = (sow.billing_info || {}) as any;


  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Page */}
        <SOWTitlePage
          clientName={sow.client_name}
          clientLogo={sow.company_logo}
          clientSignature={{
            name: sow.client_signer_name,
            title: sow.client_title,
            email: sow.client_email,
            date: sow.signature_date,
          }}
          leandataSignature={{
            name: sow.leandata_name,
            title: sow.leandata_title,
            email: sow.leandata_email,
          }}
        />

        {/* Introduction */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">LEANDATA, INC. STATEMENT OF WORK</h2>
          <SOWIntroPage 
            clientName={sow.client_name}
            customContent={sow.custom_intro_content}
            isEdited={sow.intro_content_edited}
          />
        </div>

        {/* Objectives */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">OBJECTIVES</h2>
          <SOWObjectivesPage 
            deliverables={deliverables} 
            keyObjectives={sow.key_objectives || []}
            projectDescription={objectivesDescription}
            customContent={sow.custom_objectives_disclosure_content}
            customKeyObjectivesContent={sow.custom_key_objectives_content}
            customDeliverablesContent={sow.custom_deliverables_content}
            deliverablesEdited={sow.deliverables_content_edited}
            keyObjectivesEdited={sow.key_objectives_content_edited}
            isEdited={sow.objectives_disclosure_content_edited}
            projectDetails={{
              products: productNames,
              number_of_units: sow.number_of_units || '',
              regions: sow.regions || '',
              salesforce_tenants: sow.salesforce_tenants || '',
              timeline_weeks: sow.timeline_weeks || '',
              start_date: sow.project_start_date ? new Date(sow.project_start_date) : new Date(sow.start_date),
              end_date: sow.project_end_date ? new Date(sow.project_end_date) : null,
              units_consumption: sow.units_consumption || ''
            }}
          />
        </div>

        {/* Scope */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">SCOPE</h2>
          <SOWScopePage 
            deliverables={deliverables} 
            projectDescription={projectDescription}
            customContent={sow.custom_scope_content}
            isEdited={sow.scope_content_edited}
          />
        </div>

        {/* Roles and Responsibilities */}
        <div className="max-w-7xl mx-auto bg-white p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">ROLES AND RESPONSIBILITIES</h2>
          <SOWRolesPage 
            customContent={sow.custom_roles_content}
            isEdited={sow.roles_content_edited}
          />
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
          <SOWAssumptionsPage 
            customContent={sow.custom_assumptions_content}
            isEdited={sow.assumptions_content_edited}
          />
        </div>
      </div>
    </div>
  );
} 