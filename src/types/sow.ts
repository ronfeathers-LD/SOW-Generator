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

export interface SOWData {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Header Information
  header: {
    companyLogo: string;
    clientName: string;
    sowTitle: string;
    effectiveDate: Date;
  };

  // Client Signature Information
  clientSignature: {
    name: string;
    title: string;
    email: string;
    signatureDate: Date;
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
} 