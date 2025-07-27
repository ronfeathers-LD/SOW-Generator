export interface BillingInfo {
  companyName: string;
  billingContact: string;
  billingAddress: string;
  billingEmail: string;
  poNumber: string;
  paymentTerms: string;
  currency: string;
}

export interface ClientRole {
  role: string;
  name: string;
  email: string;
  responsibilities: string;
}

export interface SOWTemplate {
  // Header Information
  sowTitle: string;
  companyLogo: string;
  
  // Customer Information
  customerName: string;
  customerSignatureName: string;
  customerSignature: string;
  customerEmail: string;
  customerSignatureDate: Date | null;
  
  // LeanData Information
  leanDataName: string;
  leanDataTitle: string;
  leanDataEmail: string;
  leanDataSignatureName: string;
  leanDataSignature: string;
  leanDataSignatureDate: Date | null;
  
  // Project Details
  products: string;
  numberOfUnits: string;
  regions: string;
  salesforceTenants: string;
  timelineWeeks: string;
  
  // Billing Information
  billingCompanyName: string;
  billingContactName: string;
  billingAddress: string;
  billingEmail: string;
  purchaseOrderNumber: string;
  
  // Salesforce Opportunity Information
  opportunityId?: string;
  opportunityName?: string;
  opportunityAmount?: number;
  opportunityStage?: string;
  opportunityCloseDate?: string;
}

export interface SOWData {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Template Variables
  template?: SOWTemplate;
  
  // Header Information
  header: {
    companyLogo: string;
    clientName: string;
    sowTitle: string;
  };

  // Client Signature Information
  clientSignature: {
    name: string;
    title: string;
    email: string;
    signatureDate: Date;
  };

  // Project Objectives
  objectives: {
    description: string;
    keyObjectives: string[];
  };

  // Project Scope
  scope: {
    projectDescription: string;
    deliverables: string;
    timeline: {
      startDate: Date;
      duration: string;
    };
  };

  // Roles and Responsibilities
  roles: {
    clientRoles: ClientRole[];
  };

  // Pricing Information
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    billing: BillingInfo;
  };

  // Project Assumptions
  assumptions: {
    accessRequirements: string;
    travelRequirements: string;
    workingHours: string;
    testingResponsibilities: string;
  };

  // Addendums
  addendums: Array<{
    title: string;
    content: string;
    risks: string[];
    mitigations: string[];
    supportScope: {
      supported: string[];
      notSupported: string[];
    };
  }>;

  clientSignerName?: string;

  deliverables?: string;
  
  // Salesforce Opportunity Information
  opportunityId?: string;
  opportunityName?: string;
  opportunityAmount?: number;
  opportunityStage?: string;
  opportunityCloseDate?: string;
} 